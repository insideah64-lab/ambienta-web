"""Offline verification of an AMBIENTA V3.2 tiled-WFS/GEOS audit archive.

Verifies every raw response, deterministic tile coverage, source reconstruction,
and repeats the full GEOS intersection. This provides integrity checking, NOT
cryptographic authentication: an attacker controlling the ZIP can rewrite hashes.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
import tempfile
from typing import Any
import zipfile

from clip import MAX_INPUT_BYTES, GeoReviewError, prepare
from wfs_collect import (
    AcquisitionError, MAX_DEPTH, MAX_WFS_REQUESTS, MAX_ALL_RESPONSES_BYTES,
    PAGE_LIMIT, canonical_json, feature_id, numeric_total, quarter, wfs_url
)

MAX_ARCHIVE_BYTES = 65 * 1024 * 1024
ALLOWED_FILES = {"assembled_source.geojson", "clip.geojson",
                 "clip_report.json", "acquisition_manifest.json"}


def broken(message: str):
    raise AcquisitionError("BUNDLE_INVALID", message)


def parse_json(data: bytes, name: str):
    try:
        return json.loads(data.decode("utf-8"),parse_constant=lambda _:
                          (_ for _ in ()).throw(ValueError("Nonfinite")))
    except (ValueError,UnicodeError,RecursionError) as exc:
        raise AcquisitionError("BUNDLE_JSON", "Contenido JSON inválido: " + name) from exc


def read_limited(bundle: zipfile.ZipFile, name: str, upper: int) -> bytes:
    info = bundle.getinfo(name)
    if info.file_size > upper:
        broken("Componente del ZIP demasiado grande: " + name)
    with bundle.open(info) as handle:
        data=handle.read(upper+1)
    if len(data)>upper:
        broken("El componente excede el límite declarado.")
    return data


def verify_bundle(path: Path) -> dict[str, Any]:
    if not path.is_file() or path.stat().st_size > MAX_ARCHIVE_BYTES:
        broken("No existe el archivo o supera los límites del validador.")
    try:
        bundle=zipfile.ZipFile(path,"r")
    except (zipfile.BadZipFile,OSError) as exc:
        raise AcquisitionError("BUNDLE_INVALID", "ZIP de auditoría inválido.") from exc
    with bundle:
        names=bundle.namelist()
        if len(names)!=len(set(names)) or any(n.startswith("/") or ".." in n.split("/")
                                           for n in names):
            broken("El ZIP contiene rutas duplicadas o inseguras.")
        if sum(info.file_size for info in bundle.infolist())>MAX_ARCHIVE_BYTES:
            broken("Contenido descomprimido demasiado grande.")
        if not ALLOWED_FILES.issubset(names):
            broken("El ZIP no contiene todos los artefactos obligatorios.")
        manifest=parse_json(read_limited(bundle,"acquisition_manifest.json",256000),
                            "acquisition_manifest.json")
        if not isinstance(manifest,dict) or manifest.get("status")!="complete_tiled_acquisition":
            broken("No es un paquete de adquisición WFS completo.")
        if manifest.get("queryIsProjectPerimeter") is not False or manifest.get("snapshotAtomic") is not False:
            broken("El manifiesto declara un perímetro/snapshot no verificado.")
        layer=manifest.get("layer")
        bbox=manifest.get("queryBbox")
        if not isinstance(bbox,list) or len(bbox)!=4:
            broken("BBOX ausente del manifiesto.")
        if manifest.get("hashScope")!="assembled_geojson_not_raw_wfs_response":
            broken("Ámbito de hash incorrecto.")
        pages=manifest.get("pages")
        if not isinstance(pages,list) or not 1<=len(pages)<=MAX_WFS_REQUESTS:
            broken("Inventario de peticiones WFS inválido.")
        if manifest.get("requestCount")!=len(pages):
            broken("El inventario no coincide con el total de peticiones.")
        expected_names={f"raw_wfs/{i:03d}.geojson" for i in range(len(pages))}
        if set(names)!=expected_names | ALLOWED_FILES:
            broken("El ZIP contiene entradas inesperadas o carece de respuestas WFS.")
        rows=[];read_bytes=0
        for i,page in enumerate(pages):
            page_name=f"raw_wfs/{i:03d}.geojson"
            if not isinstance(page,dict) or page.get("name")!=page_name:
                broken("La secuencia de subventanas está alterada.")
            raw=read_limited(bundle,page_name,1_048_576)
            sha=hashlib.sha256(raw).hexdigest()
            if sha!=page.get("rawSha256") or len(raw)!=page.get("rawBytes"):
                raise AcquisitionError("BUNDLE_HASH_MISMATCH",
                                       "La respuesta WFS original no coincide con su SHA: "+page_name)
            data=parse_json(raw,page_name)
            if not isinstance(data,dict) or data.get("type")!="FeatureCollection":
                broken("Respuesta WFS no es una FeatureCollection.")
            items=data.get("features")
            if not isinstance(items,list) or len(items)>PAGE_LIMIT:
                broken("La respuesta WFS excede los límites o no contiene entidades válidas.")
            declared=numeric_total(data)
            if declared!=page.get("reportedCount") or len(items)!=page.get("returnedCount"):
                broken("Contadores del manifiesto no coinciden con los originales.")
            if page.get("completeTile") is not (declared==len(items)):
                broken("Una ventana figura completa sin serlo.")
            if data.get("numberReturned") is not None and int(data["numberReturned"])!=len(items):
                broken("numberReturned contradice la respuesta original.")
            if page.get("sourceUrl")!=wfs_url(layer,page.get("bbox")):
                broken("La URL original no cumple la lista blanca y BBOX declaradas.")
            rows.append((page,items))
            read_bytes+=len(raw)
        if manifest.get("totalResponseBytes")!=read_bytes:
            broken("El presupuesto de bytes del manifiesto no coincide.")
        if read_bytes>MAX_ALL_RESPONSES_BYTES:
            broken("Respuestas WFS originales exceden el presupuesto.")
        cursor=0
        accepted={}
        fingerprints={}
        def walk(expected_bbox,depth):
            nonlocal cursor
            if cursor>=len(rows):
                broken("Faltan subventanas para cubrir la BBOX original.")
            page,items=rows[cursor]
            cursor+=1
            if page.get("bbox")!=expected_bbox or page.get("depth")!=depth:
                broken("La cobertura espacial fue alterada.")
            total=page["reportedCount"]
            if total>PAGE_LIMIT:
                if page["completeTile"] or depth>=MAX_DEPTH:
                    broken("Ventana WFS parcial sin subdivisión válida.")
                for child in quarter(expected_bbox):
                    walk(child,depth+1)
            else:
                if not page["completeTile"]:
                    broken("Ventana terminal parcial.")
                for item in items:
                    key=feature_id(item)
                    digest=hashlib.sha256(canonical_json({
                        "geometry":item["geometry"],"properties":item.get("properties") or {}
                    })).hexdigest()
                    if key in fingerprints and digest!=fingerprints[key]:
                        broken("Una entidad cambió entre subventanas.")
                    accepted[key]=item
                    fingerprints[key]=digest
        walk(bbox,0)
        if cursor!=len(rows):
            broken("El ZIP contiene subventanas adicionales que no corresponden a la división.")
        root_count=rows[0][0]["reportedCount"]
        if len(accepted)!=root_count or manifest.get("observedSourceCount")!=root_count:
            broken("Los identificadores no completan el número anunciado por el WFS.")
        if manifest.get("uniqueFeatures")!=len(accepted):
            broken("La cantidad de entidades únicas fue alterada.")
        assembled={
            "type":"FeatureCollection",
            "crs":{"type":"name","properties":{"name":"EPSG:4326"}},
            "numberOfFeatures":len(accepted),
            "features":[accepted[key] for key in sorted(accepted)],
        }
        raw_source=read_limited(bundle,"assembled_source.geojson",MAX_INPUT_BYTES)
        if raw_source!=canonical_json(assembled):
            broken("La colección ensamblada no coincide con las respuestas originales.")
        if hashlib.sha256(raw_source).hexdigest()!=manifest.get("sourceFileSha256"):
            raise AcquisitionError("BUNDLE_HASH_MISMATCH",
                                   "SHA del archivo ensamblado no coincide.")
        with tempfile.TemporaryDirectory(prefix="ambienta-audit-verify-") as tmp:
            source=Path(tmp)/"assembled.geojson"
            source.write_bytes(raw_source)
            expected_clip, expected_report=prepare(source,bbox)
        clip=read_limited(bundle,"clip.geojson",MAX_INPUT_BYTES)
        report=read_limited(bundle,"clip_report.json",256000)
        if clip!=canonical_json(expected_clip) or report!=canonical_json(expected_report):
            broken("Recorte GEOS o informe difiere de la ejecución independiente.")
        if manifest.get("selectedCount")!=expected_report["selectedCount"]:
            broken("La selección informada difiere de GEOS.")
        return {
            "result":"PASS","rawResponsesVerified":len(pages),
            "sourceCount":len(accepted),"selectedCount":expected_report["selectedCount"],
            "verifiedSha256":hashlib.sha256(raw_source).hexdigest(),
            "providerSnapshotAtomic":False,
            "warning":"Integridad interna comprobada; no hay firma digital de autenticidad de IDESA.",
        }


def main()->int:
    parser=argparse.ArgumentParser(description="Verificar ZIP WFS y recalcular recorte GEOS sin red")
    parser.add_argument("zip_path",type=Path)
    args=parser.parse_args()
    try:
        result=verify_bundle(args.zip_path)
        print(json.dumps(result,ensure_ascii=False))
        return 0
    except (AcquisitionError,GeoReviewError,ValueError,zipfile.BadZipFile) as exc:
        print(json.dumps({"result":"BLOCKED","code":getattr(exc,"code","VERIFY_FAILED"),
                          "reason":str(exc)},ensure_ascii=False))
        return 2


if __name__=="__main__":
    raise SystemExit(main())
