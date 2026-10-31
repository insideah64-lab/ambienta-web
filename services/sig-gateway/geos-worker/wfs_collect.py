"""AMBIENTA V3.2 — audited WFS 1.0.0 acquisition by adaptive BBOX tiles.

This is an OFFLINE/CLI laboratory, not a publicly exposed endpoint. GeoServer
WFS 1.0 pagination with startIndex has server-specific ordering guarantees;
adaptive BBOX subdivision avoids trusting unstable offset pagination. Every
terminal tile must be complete, and its unique feature IDs must reconcile with
the root advertised count. The provider can still change during acquisition:
this is NOT an atomic snapshot of a mutable WFS.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener
import zipfile

from clip import GeoReviewError, MAX_INPUT_BYTES, MAX_FEATURES, validate_bbox, prepare, atomic_json

WFS_ENDPOINT = "https://geoportal.salta.gob.ar/geoserver/wfs"
LAYERS = {
    "municipios": "geonode:municipios",
    "otbn": "geonode:otbn_2009_ll",
    "vegetacion": "geonode:unid_veg_cabral_etal_2009",
}
PAGE_LIMIT = 20
MAX_WFS_REQUESTS = 64
MAX_PER_RESPONSE_BYTES = 1_048_576
MAX_ALL_RESPONSES_BYTES = MAX_INPUT_BYTES
MAX_DEPTH = 6
MIN_TILE_DEGREES = 0.00001
CRS_NAMES = {
    "EPSG:4326", "urn:ogc:def:crs:EPSG::4326",
    "urn:ogc:def:crs:EPSG:6.6:4326",
    "http://www.opengis.net/def/crs/EPSG/0/4326",
    "OGC:CRS84", "urn:ogc:def:crs:OGC:1.3:CRS84",
}


class AcquisitionError(GeoReviewError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise AcquisitionError("PROVIDER_REDIRECT", "El WFS cambió de URL; no se siguen redirecciones.")


def official_open(url: str, timeout: float):
    # All outbound URLs are built from the constant allowlisted HTTPS endpoint.
    req = Request(url, headers={"Accept": "application/json", "User-Agent": "AMBIENTA-SIG-lab/3.2"})
    return build_opener(NoRedirect).open(req, timeout=timeout)


def canonical_json(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, allow_nan=False,
                       sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def numeric_total(document: dict[str, Any]) -> int:
    for key in ("totalFeatures", "numberOfFeatures", "numberMatched"):
        value = document.get(key)
        if value is None:
            continue
        if isinstance(value, bool) or not (
            isinstance(value, int) or
            (isinstance(value, str) and value.isascii() and value.isdecimal())
        ):
            raise AcquisitionError("COUNT_UNKNOWN", "El WFS no informa un total numérico fiable.")
        count = int(value)
        if count > 100_000 or count < 0:
            raise AcquisitionError("COUNT_LIMIT", "El conteo WFS excede los límites declarados.")
        return count
    raise AcquisitionError("COUNT_UNKNOWN", "El WFS no informó un total de entidades.")


def feature_id(item: Any) -> str:
    if not isinstance(item, dict) or item.get("type") != "Feature":
        raise AcquisitionError("INVALID_FEATURE", "La respuesta contiene una entidad no GeoJSON.")
    value = item.get("id")
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        raise AcquisitionError("UNSTABLE_FEATURE_ID", "Falta el identificador estable de entidad WFS.")
    label = str(value)
    if not 1 <= len(label) <= 200:
        raise AcquisitionError("UNSTABLE_FEATURE_ID", "Identificador WFS vacío o demasiado largo.")
    if not isinstance(item.get("geometry"), dict):
        raise AcquisitionError("INVALID_FEATURE", "No se recibió geometría GeoJSON.")
    if item["geometry"].get("type") not in ("Polygon", "MultiPolygon"):
        raise AcquisitionError("NOT_POLYGON", "La capa incluye geometrías no poligonales.")
    return label


def validate_request(layer: str, bbox: list[float]) -> list[float]:
    if layer not in LAYERS:
        raise AcquisitionError("UNKNOWN_LAYER", "Solo se permiten capas IDESA expresamente autorizadas.")
    bbox = validate_bbox(bbox)
    w, s, e, n = bbox
    if e-w > 0.7 or n-s > 0.7 or (e-w)*(n-s) > 0.12:
        raise AcquisitionError("BBOX_TOO_LARGE", "Reducí la ventana WFS antes de consultar.")
    return bbox


def wfs_url(layer: str, bbox: list[float]) -> str:
    params = {
        "service": "WFS", "version": "1.0.0", "request": "GetFeature",
        "typeName": LAYERS[layer], "outputFormat": "application/json",
        "srsName": "EPSG:4326", "maxFeatures": str(PAGE_LIMIT),
        "bbox": ",".join(str(x) for x in bbox) + ",EPSG:4326",
    }
    return WFS_ENDPOINT + "?" + urlencode(params)


def quarter(bbox: list[float]) -> list[list[float]]:
    w, s, e, n = bbox
    x = (w+e)/2
    y = (s+n)/2
    if x <= w or x >= e or y <= s or y >= n:
        raise AcquisitionError("TILE_TOO_SMALL", "No se puede subdividir la ventana con seguridad.")
    return [[w,s,x,y],[x,s,e,y],[w,y,x,n],[x,y,e,n]]


@dataclass
class RawPage:
    bbox: list[float]
    url: str
    total: int
    features: list[dict[str, Any]]
    raw: bytes
    digest: str
    depth: int
    is_complete: bool


@dataclass
class Acquisition:
    layer: str
    bbox: list[float]
    total: int
    pages: list[RawPage] = field(default_factory=list)
    accepted: dict[str, dict[str, Any]] = field(default_factory=dict)
    fingerprints: dict[str, str] = field(default_factory=dict)
    total_bytes: int = 0
    root_count: int | None = None

    @property
    def request_count(self) -> int:
        return len(self.pages)

    def read_page(self, tile: list[float], depth: int, open_fn: Callable,
                  timeout: float) -> RawPage:
        if self.request_count >= MAX_WFS_REQUESTS:
            raise AcquisitionError("REQUEST_BUDGET", "Se alcanzó el presupuesto de peticiones WFS.")
        url = wfs_url(self.layer, tile)
        try:
            with open_fn(url, timeout) as reply:
                status = getattr(reply, "status", 200)
                if status != 200:
                    raise AcquisitionError("PROVIDER_ERROR", "IDESA devolvió HTTP " + str(status))
                headers = getattr(reply, "headers", {})
                content_type = headers.get("Content-Type", "application/json")
                if "json" not in str(content_type).lower():
                    raise AcquisitionError("INVALID_PROVIDER_FORMAT", "El WFS no devolvió JSON.")
                raw = reply.read(MAX_PER_RESPONSE_BYTES + 1)
        except AcquisitionError:
            raise
        except (HTTPError, URLError, OSError, TimeoutError) as exc:
            raise AcquisitionError("PROVIDER_UNAVAILABLE", "La descarga WFS falló: " +
                                   type(exc).__name__) from exc
        if len(raw) > MAX_PER_RESPONSE_BYTES:
            raise AcquisitionError("PAGE_TOO_LARGE", "La respuesta WFS supera 1 MiB.")
        if self.total_bytes + len(raw) > MAX_ALL_RESPONSES_BYTES:
            raise AcquisitionError("TOTAL_BYTES_LIMIT", "Las respuestas superan el presupuesto de 20 MiB.")
        try:
            data = json.loads(raw.decode("utf-8"), parse_constant=lambda _: (
                _ for _ in ()).throw(ValueError("nonfinite")))
        except (UnicodeError, ValueError, RecursionError) as exc:
            raise AcquisitionError("INVALID_PROVIDER_JSON", "El WFS no devolvió GeoJSON UTF-8 válido.") from exc
        if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
            raise AcquisitionError("NOT_FEATURE_COLLECTION", "El WFS devolvió una respuesta ajena a GeoJSON.")
        crs = data.get("crs")
        if crs is not None:
            if not isinstance(crs, dict) or crs.get("type") != "name" or (
                not isinstance(crs.get("properties"), dict) or
                crs["properties"].get("name") not in CRS_NAMES
            ):
                raise AcquisitionError("CRS_REVIEW", "El proveedor informó un CRS no admitido.")
        features = data.get("features")
        if not isinstance(features, list) or len(features) > PAGE_LIMIT:
            raise AcquisitionError("UNBOUNDED_PAGE", "El WFS ignoró el máximo de entidades por petición.")
        total = numeric_total(data)
        if total < len(features):
            raise AcquisitionError("INCONSISTENT_COUNT", "El WFS declaró menos entidades de las recibidas.")
        if data.get("numberReturned") is not None:
            returned = data["numberReturned"]
            if isinstance(returned, bool) or not (
                isinstance(returned, int) or
                (isinstance(returned, str) and returned.isascii() and returned.isdecimal())
            ) or int(returned) != len(features):
                raise AcquisitionError("INCONSISTENT_COUNT", "numberReturned no coincide.")
        for item in features:
            feature_id(item)
        if total <= PAGE_LIMIT and len(features) != total:
            raise AcquisitionError("INCOMPLETE_TILE", "Una ventana terminal llegó incompleta.")
        if total > PAGE_LIMIT and len(features) == 0:
            raise AcquisitionError("INCONSISTENT_COUNT", "El WFS anunció entidades pero no devolvió ninguna.")
        self.total_bytes += len(raw)
        page = RawPage(tile,url,total,features,raw,hashlib.sha256(raw).hexdigest(),
                       depth,total==len(features))
        self.pages.append(page)
        return page

    def visit(self, tile: list[float], depth: int, open_fn: Callable, timeout: float):
        page = self.read_page(tile, depth, open_fn, timeout)
        if depth == 0:
            self.root_count = page.total
            if page.total > MAX_FEATURES:
                raise AcquisitionError("FEATURE_BUDGET", "Más de 2.000 entidades en la ventana solicitada.")
        if page.total > PAGE_LIMIT:
            w,s,e,n = tile
            if depth >= MAX_DEPTH or e-w <= MIN_TILE_DEGREES or n-s <= MIN_TILE_DEGREES:
                raise AcquisitionError("UNRESOLVED_TILE", "Se alcanzó el límite de subdivisión: datos incompletos.")
            for child in quarter(tile):
                self.visit(child, depth+1, open_fn, timeout)
            return
        for item in page.features:
            key = feature_id(item)
            checksum = hashlib.sha256(canonical_json({
                "geometry":item["geometry"],"properties":item.get("properties") or {}
            })).hexdigest()
            if key in self.fingerprints and checksum != self.fingerprints[key]:
                raise AcquisitionError("CHANGING_FEATURE", "Una misma entidad cambió entre subventanas.")
            self.fingerprints[key] = checksum
            self.accepted[key] = item

    def finish(self) -> dict[str, Any]:
        if self.root_count is None or len(self.accepted) != self.root_count:
            raise AcquisitionError("ROOT_COUNT_MISMATCH",
                                   "No se pudo conciliar el total original con los mosaicos WFS.")
        items = [self.accepted[key] for key in sorted(self.accepted)]
        return {"type":"FeatureCollection",
                "crs":{"type":"name","properties":{"name":"EPSG:4326"}},
                "numberOfFeatures":len(items),"features":items}


def acquire(layer: str, bbox: list[float], *,
            open_fn: Callable = official_open, timeout: float = 8.0) -> tuple[Acquisition,dict[str,Any]]:
    checked = validate_request(layer,bbox)
    result = Acquisition(layer,checked,0)
    result.visit(checked,0,open_fn,timeout)
    assembled = result.finish()
    return result, assembled


def build_archive(layer: str, bbox: list[float], output: Path, *,
                  open_fn: Callable = official_open,
                  clock: Callable = lambda: datetime.now(timezone.utc)) -> dict[str, Any]:
    if output.exists() or output.is_symlink():
        raise AcquisitionError("OUTPUT_EXISTS", "No se sobrescriben archivos de auditoría anteriores.")
    result, source = acquire(layer,bbox,open_fn=open_fn)
    source_bytes = canonical_json(source)
    if len(source_bytes) > MAX_INPUT_BYTES:
        raise AcquisitionError("ASSEMBLED_TOO_LARGE", "El GeoJSON ensamblado supera 20 MiB.")
    with tempfile.TemporaryDirectory(prefix="ambienta-wfs-") as tmp:
        source_path = Path(tmp)/"assembled.geojson"
        source_path.write_bytes(source_bytes)
        clip, clip_report = prepare(source_path,result.bbox)
        page_manifest = []
        for index,page in enumerate(result.pages):
            page_manifest.append({
                "name":f"raw_wfs/{index:03d}.geojson",
                "bbox":page.bbox,"depth":page.depth,
                "sourceUrl":page.url,"reportedCount":page.total,
                "returnedCount":len(page.features),
                "completeTile":page.is_complete,
                "rawSha256":page.digest,"rawBytes":len(page.raw),
            })
        manifest = {
            "status":"complete_tiled_acquisition", "method":"WFS 1.0.0 / adaptive_BBOX_quadtree",
            "provider":"IDESA Salta","layer":layer,"typeName":LAYERS[layer],
            "queryBbox":result.bbox,"queryIsProjectPerimeter":False,
            "observedSourceCount":result.root_count,"uniqueFeatures":len(source["features"]),
            "selectedCount":clip_report["selectedCount"],"maxWfsRequests":MAX_WFS_REQUESTS,
            "requestCount":len(result.pages),"totalResponseBytes":result.total_bytes,
            "sourceFileSha256":hashlib.sha256(source_bytes).hexdigest(),
            "hashScope":"assembled_geojson_not_raw_wfs_response",
            "rawSourceResponsesRetained":True,
            "pages":page_manifest,"receivedAt":clock().isoformat(),
            "snapshotAtomic":False,
            "caveat":"La conciliación por IDs y recuentos NO asegura una instantánea transaccional del WFS mutable.",
            "license":"unverified_before_redistribution",
            "clipMethod":"GEOS / Shapely 2.1 strict",
        }
        output.parent.mkdir(parents=True,exist_ok=True)
        fd,temp_name=tempfile.mkstemp(prefix=".ambienta-",suffix=".zip",dir=output.parent)
        try:
            with os.fdopen(fd,"wb") as stream,zipfile.ZipFile(
                    stream,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=6) as bundle:
                for index,page in enumerate(result.pages):
                    bundle.writestr(f"raw_wfs/{index:03d}.geojson",page.raw)
                bundle.writestr("assembled_source.geojson",source_bytes)
                bundle.writestr("clip.geojson",canonical_json(clip))
                bundle.writestr("clip_report.json",canonical_json(clip_report))
                bundle.writestr("acquisition_manifest.json",canonical_json(manifest))
            # Hard-link creation refuses existing targets, including symlinks.
            os.link(temp_name,output)
        finally:
            Path(temp_name).unlink(missing_ok=True)
    return manifest


def main() -> int:
    parser=argparse.ArgumentParser(description="IDESA Salta WFS → teselas completas → GEOS → ZIP auditado")
    parser.add_argument("--layer",required=True,choices=sorted(LAYERS))
    parser.add_argument("--bbox",required=True,help="oeste,sur,este,norte (usar --bbox= para longitudes negativas)")
    parser.add_argument("--output",required=True,type=Path,help="ZIP nuevo: no se sobreescribe")
    parser.add_argument("--review",type=Path,help="informe JSON opcional, solo cuando el trabajo se bloquea")
    args=parser.parse_args()
    try:
        numbers=[float(x) for x in args.bbox.split(",")]
        if args.review is not None and args.review.resolve()==args.output.resolve():
            raise AcquisitionError("OUTPUT_COLLISION","El informe y el ZIP deben tener rutas distintas.")
        report=build_archive(args.layer,numbers,args.output)
        print(json.dumps({"result":"PASS","requestCount":report["requestCount"],
                          "sourceCount":report["observedSourceCount"],
                          "selectedCount":report["selectedCount"],
                          "bundle":str(args.output)},ensure_ascii=False))
        return 0
    except (AcquisitionError,GeoReviewError,ValueError) as exc:
        issue={"status":"requires_review","code":getattr(exc,"code","GEOMETRY_REVIEW"),
               "reason":str(exc),"outputWritten":False}
        if args.review is not None and not args.review.exists() and not args.review.is_symlink():
            atomic_json(args.review,issue)
        print(json.dumps(issue,ensure_ascii=False))
        return 2


if __name__=="__main__":
    raise SystemExit(main())
