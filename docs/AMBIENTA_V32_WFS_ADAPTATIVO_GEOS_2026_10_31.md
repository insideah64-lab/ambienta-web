# AMBIENTA V3.2 — Adquisición WFS verificable y GEOS sin truncamientos

**Fecha del desarrollo:** 31 de octubre de 2026. **Estado:** laboratorio Python / adquisición controlada; no conectado a la API pública V3.1.

## Qué problema resuelve

Un WFS puede devolver solo las primeras 20 entidades de una respuesta y ocultar la existencia de muchas más. Usar `startIndex` sin comprobar que el servidor respeta un orden estable tampoco garantiza que no haya omisiones o duplicados. AMBIENTA V3.2 ofrece un método alternativo **espacial**, no una promesa de compatibilidad con toda paginación WFS:

1. Recibe un BBOX EPSG:4326 y una capa de la lista blanca de IDESA Salta.
2. Consulta WFS 1.0.0 con `maxFeatures=20` y limita a 1 MiB cada respuesta.
3. Si el proveedor informa **20 o más** entidades, divide la ventana en cuatro. Divide también cuando anuncia exactamente 20, porque podría representar un truncamiento oculto.
4. Cada ventana terminal debe declarar un total numérico, no contradictorio, y devolver todas sus entidades. Nunca exporta una ventana terminal parcial.
5. Exige `Feature.id` estable, detecta cambios de geometría/atributos entre ventanas, deduplica entidades que intersectan varios límites y comprueba que el número final de IDs coincida con el total original.
6. Envía el GeoJSON ensamblado al motor GEOS/Shapely, que valida cada polígono y hace el recorte topológico de cóncavos, agujeros y multipolígonos. **Cualquier geometría inválida bloquea la exportación completa.**

Este procedimiento evita depender de offsets y permite auditar la cobertura geométrica; **no garantiza una instantánea transaccional de un servidor que cambia durante el trabajo**. Si un proveedor no declara totales fiables o no entrega IDs estables, el proceso se bloquea en lugar de inventar completitud.

## Contratos y límites

| Restricción | V3.2 laboratorio |
|---|---|
| Capas de origen | IDESA: municipios, OTBN 2009 y unidades de vegetación 2009 |
| Host | `https://geoportal.salta.gob.ar/geoserver/wfs` fijo |
| Sistema de coordenadas | WGS84 EPSG:4326, sin reproyección implícita |
| Máxima consulta | 0,7° por lado y 0,12 grados cuadrados |
| Entidades por petición | 20 |
| Peticiones por adquisición | 64 |
| Máximo de tiempo por trabajo | 90 segundos |
| Respuesta individual | 1 MiB |
| Todas las respuestas crudas | 20 MiB |
| GeoJSON ensamblado / recorte | 20 MiB cada uno |
| Entidades únicas | 2.000 |
| Vértices de entrada a GEOS | 200.000 |
| División espacial | hasta 6 niveles |
| Geometrías inválidas | estado de revisión; sin exportación parcial |
| Licencia de uso o redistribución | **No verificada** para cada capa |

Los límites se aplican al entorno de laboratorio. **No son autorización para ejecutar cientos de consultas en paralelo ni para descargar una provincia completa.**

## Conservación íntegra de respuestas

El ZIP generado es autocontenido:

- `raw_wfs/000.geojson`, `raw_wfs/001.geojson`, etc.: los bytes originales de *cada* respuesta HTTP WFS, sin alterar.
- `acquisition_manifest.json`: URL, BBOX, profundidad, cantidad anunciada y recibida, SHA-256 de cada respuesta, tiempo, límites y advertencia `snapshotAtomic: false`.
- `assembled_source.geojson`: capa ensamblada sin recortar, por IDs deduplicados, **derivada** de las subventanas.
- `clip.geojson`: resultado geométrico derivado por GEOS.
- `clip_report.json`: SHA-256 del archivo ensamblado, diagnósticos y distinción entre ventana y perímetro real de proyecto.

**La SHA-256 del ensamblado no es una SHA de una única respuesta WFS original.** Se distingue mediante `hashScope: "assembled_geojson_not_raw_wfs_response"`. Cada respuesta cruda tiene su SHA-256 independiente, y el ZIP conserva sus bytes.

La herramienta `verify_bundle.py` permite reabrir el ZIP sin Internet, comprobar sus rutas y límites, recomponer la cobertura de la división espacial, volver a calcular los SHA y el recorte GEOS. Estas son pruebas de **integridad interna**, no una firma digital de la autoridad provincial.

## Ejecución y QA

Manual de uso: [geos-worker/README.md](../services/sig-gateway/geos-worker/README.md).

```bash
python -m pip install -r services/sig-gateway/geos-worker/requirements.txt
python services/sig-gateway/geos-worker/wfs_collect.py --layer municipios \
  --bbox=-66.222472174,-25.056742206,-66.182768004,-25.020769366 \
  --output cachi_auditado.zip --review cachi_revision.json

python services/sig-gateway/geos-worker/verify_bundle.py cachi_auditado.zip
python -m unittest discover -s services/sig-gateway/geos-worker/tests -v
```

La primera orden **consulta IDESA real**. Las pruebas automatizadas ejecutan un WFS falso hermético, sin llamar al organismo. Incluyen casos de respuestas incompletas, conteos conflictivos, 20 entidades exactas, geometrías cambiantes, duplicados en límites, topologías inválidas, recorte cóncavo con huecos, presupuestos de tiempo/bytes/peticiones y manipulación del ZIP.

## Arquitectura pendiente para uso web

El trabajo sigue siendo local por una razón de seguridad: un servicio público de geometrías grandes necesitará autenticación real por usuario, cola durable, límites de memoria/CPU, aislamiento de procesos, limpieza de temporales, licencias verificadas y facturación/cuotas. La Edge Function V3.1 actual protege consultas pequeñas con cuotas distribuidas, pero **no es un worker GEOS de gran escala**.

**No se modificaron V1 ni V2.** El polígono del WFS, el BBOX de consulta y el perímetro ambiental real del proyecto son tres conceptos diferentes. La ventana de ensayo de Cachi **no es** un límite geográfico acreditado de Diablillos.

## Referencias de continuidad

- [V3.1 · Cuotas distribuidas](./AMBIENTA_V31_CUOTAS_DISTRIBUIDAS_2026_10_31.md)
- [Código del recolector](../services/sig-gateway/geos-worker/wfs_collect.py)
- [Verificador autónomo](../services/sig-gateway/geos-worker/verify_bundle.py)
- [CI GEOS/WFS](../.github/workflows/sig-geos-worker-ci.yml)
