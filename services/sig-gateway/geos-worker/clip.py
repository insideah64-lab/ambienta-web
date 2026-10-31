"""AMBIENTA SIG · bounded offline GEOS/ Shapely clipper.

An independent GIS worker for larger LOCAL GeoJSON, not a hosted endpoint.
It never mutates the original file or silently repairs source geometries.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import tempfile
from pathlib import Path
from typing import Any

from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, box, mapping, shape
from shapely.validation import explain_validity
from shapely.errors import GEOSException

MAX_INPUT_BYTES = 20 * 1024 * 1024
MAX_FEATURES = 2000
MAX_VERTICES = 200000
ALLOWED_CRS = {
    "EPSG:4326", "urn:ogc:def:crs:EPSG::4326",
    "urn:ogc:def:crs:EPSG:6.6:4326",
    "http://www.opengis.net/def/crs/EPSG/0/4326",
    "urn:ogc:def:crs:OGC:1.3:CRS84", "OGC:CRS84",
}


class GeoReviewError(ValueError):
    def __init__(self, message: str, issues: list[dict[str, Any]] | None = None,
                 manifest: dict[str, Any] | None = None):
        super().__init__(message)
        self.issues = issues or []
        self.manifest = manifest or {}


def validate_bbox(bbox: list[float]) -> list[float]:
    if len(bbox) != 4 or any(not isinstance(x, (int, float)) or
                                isinstance(x, bool) or not math.isfinite(x) for x in bbox):
        raise GeoReviewError("Se requieren cuatro coordenadas BBOX WGS84 finitas.")
    w, s, e, n = map(float, bbox)
    if not (-180 <= w < e <= 180 and -90 <= s < n <= 90):
        raise GeoReviewError("BBOX EPSG:4326 inválida o cruzando el antimeridiano.")
    return [w, s, e, n]


def polygon_rings(geom: dict[str, Any]) -> list[list[list[list[float]]]]:
    if not isinstance(geom, dict):
        raise GeoReviewError("La geometría no es un objeto GeoJSON.")
    typ = geom.get("type")
    if typ not in ("Polygon", "MultiPolygon"):
        raise GeoReviewError("Este motor avanzado exige Polygon o MultiPolygon.")
    data = geom.get("coordinates")
    if not isinstance(data, list) or not data:
        raise GeoReviewError("Polígono sin coordenadas.")
    return [data] if typ == "Polygon" else data


def inspect_rings(geom: dict[str, Any]) -> int:
    count = 0
    for poly in polygon_rings(geom):
        if not isinstance(poly, list) or not poly:
            raise GeoReviewError("Polígono sin contorno exterior.")
        for ring in poly:
            if not isinstance(ring, list) or len(ring) < 4:
                raise GeoReviewError("Anillo con menos de cuatro puntos.")
            previous_lon = None
            for point in ring:
                if not isinstance(point, list) or len(point) != 2 or any(
                    not isinstance(a, (int, float)) or isinstance(a, bool) or
                    not math.isfinite(a) for a in point
                ):
                    raise GeoReviewError("Punto no finito o con coordenadas distintas de lon/lat.")
                lon, lat = point
                if previous_lon is not None and abs(lon - previous_lon) > 180:
                    raise GeoReviewError("Anillo cruza el antimeridiano: requiere SIG geodésico especializado.")
                previous_lon = lon
                if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                    raise GeoReviewError("Coordenada fuera de WGS84 EPSG:4326.")
                count += 1
                if count > MAX_VERTICES:
                    raise GeoReviewError("Demasiados vértices para la política de esta herramienta.")
            if ring[0] != ring[-1]:
                raise GeoReviewError("Anillo abierto: no se cierra automáticamente.")
    return count


def numeric_count(value: Any, key: str) -> int:
    if isinstance(value, bool) or (
        not isinstance(value, int) and
        not (isinstance(value, str) and value.isascii() and value.isdecimal())
    ):
        raise GeoReviewError("Contador WFS no fiable: " + key)
    return int(value)


def polygon_only(result: Any) -> Polygon | MultiPolygon | None:
    if result.is_empty:
        return None
    if isinstance(result, (Polygon, MultiPolygon)):
        return result if result.area > 0 else None
    if isinstance(result, GeometryCollection):
        polygons = [g for g in result.geoms if isinstance(g, Polygon) and g.area > 0]
        if not polygons:
            return None
        output = polygons[0] if len(polygons) == 1 else MultiPolygon(polygons)
        if not output.is_valid:
            raise GeoReviewError("GEOS produjo componentes poligonales inválidos.")
        return output
    return None  # Contacto con el borde de área nula (solo línea o punto).


def prepare(input_path: Path, bbox: list[float]) -> tuple[dict[str, Any], dict[str, Any]]:
    bbox = validate_bbox(bbox)
    if not input_path.is_file() or input_path.stat().st_size > MAX_INPUT_BYTES:
        raise GeoReviewError("El archivo falta o supera el límite local de 20 MiB.")
    original = input_path.read_bytes()
    sha = hashlib.sha256(original).hexdigest()

    try:
        data = json.loads(original.decode("utf-8"),
                          parse_constant=lambda x: (_ for _ in ()).throw(
                              GeoReviewError("Valores NaN/Infinity prohibidos.")))
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise GeoReviewError("El archivo no contiene GeoJSON UTF-8 válido.") from exc
    if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
        raise GeoReviewError("Se requiere un GeoJSON FeatureCollection.")
    if "crs" in data and data["crs"] is not None:
        name = (data["crs"].get("properties", {}).get("name")
                if isinstance(data["crs"], dict) else None)
        if name not in ALLOWED_CRS:
            raise GeoReviewError("CRS no reconocido; reproyectá explícitamente en un SIG.")
    features = data.get("features")
    if not isinstance(features, list) or len(features) > MAX_FEATURES:
        raise GeoReviewError("Cantidad de entidades fuera de límite (máximo 2.000).")
    for key in ("numberOfFeatures", "totalFeatures", "numberMatched", "numberReturned"):
        if data.get(key) is not None and numeric_count(data[key], key) != len(features):
            raise GeoReviewError("WFS incompleto: " + key + " no coincide con las entidades.")
    extent = box(*bbox)
    count = 0
    out = []
    issues: list[dict[str, Any]] = []
    outside = 0

    for index, feature in enumerate(features):
        try:
            if not isinstance(feature, dict) or feature.get("type") != "Feature":
                raise GeoReviewError("Elemento distinto de GeoJSON Feature.")
            geom_json = feature.get("geometry")
            local_count = inspect_rings(geom_json)
            count += local_count
            if count > MAX_VERTICES:
                raise GeoReviewError("La colección supera los 200.000 vértices.")
            geom = shape(geom_json)
            if not geom.is_valid or geom.is_empty:
                raise GeoReviewError("Topología inválida: " + explain_validity(geom))
            result = polygon_only(geom.intersection(extent))
            if result is None:
                outside += 1
                continue
            if not result.is_valid:
                raise GeoReviewError("Recorte con topología inválida: " + explain_validity(result))
            props = feature.get("properties") or {}
            label = (props.get("name") or props.get("nombre") or ("Entidad " + str(index+1))
                     if isinstance(props, dict) else ("Entidad " + str(index+1)))
            label = str(label).strip()[:120]
            out.append({"type": "Feature", "properties": {"name": label, "sourceIndex": index},
                        "geometry": mapping(result)})
        except (GeoReviewError, GEOSException, ValueError, TypeError, KeyError) as exc:
            issues.append({"index": index, "reason": str(exc)[:250]})

    manifest = {
        "status": "requires_review" if issues else "complete",
        "sourceFile": input_path.name,
        "sourceSha256": sha,
        "hashScope": "original_input_file_bytes",
        "crs": "EPSG:4326",
        "bbox": bbox,
        "sourceCount": len(features),
        "selectedCount": len(out) if not issues else None,
        "outsideCount": outside if not issues else None,
        "coordinateCount": count,
        "invalidCount": len(issues),
        "issues": issues,
        "method": "GEOS / Shapely 2.1 · intersección topológica estricta (sin reparación)",
        "originalInputUnmodified": True,
        "queryIsProjectPerimeter": False,
        "license": "not_verified_for_redistribution",
    }
    if issues:
        raise GeoReviewError("Hay geometrías que requieren revisión; ninguna exportación parcial.", issues, manifest)
    return {"type": "FeatureCollection", "features": out,
            "properties": {"ambientaClip": manifest}}, manifest


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".ambienta-", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def main() -> int:
    parser = argparse.ArgumentParser(description="Recorte geográfico GEOS de GeoJSON local, sin alterar el original")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--bbox", required=True, help="oeste,sur,este,norte en WGS84")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    args = parser.parse_args()
    if args.input.resolve() in (args.output.resolve(), args.report.resolve()) or args.output.resolve() == args.report.resolve():
        parser.error("La entrada, el recorte y el informe deben ser archivos diferentes.")
    if args.output.exists() or args.report.exists():
        parser.error("La salida o el informe ya existen: usá rutas nuevas para preservar auditorías anteriores.")
    try:
        bbox = [float(x) for x in args.bbox.split(",")]
        result, manifest = prepare(args.input, bbox)
        atomic_json(args.output, result)
        atomic_json(args.report, manifest)
        print(json.dumps({"status": "PASS", "selectedCount": manifest["selectedCount"],
                          "sourceSha256": manifest["sourceSha256"]}))
        return 0
    except GeoReviewError as exc:
        atomic_json(args.report, {**exc.manifest, "status": "requires_review",
                                  "reason": str(exc), "issues": exc.issues,
                                  "outputWritten": False})
        print(json.dumps({"status": "BLOCKED", "error": str(exc), "issues": exc.issues}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
