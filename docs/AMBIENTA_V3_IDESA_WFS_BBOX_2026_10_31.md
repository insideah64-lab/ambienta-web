# AMBIENTA V3 · IDESA Salta WFS por coordenadas
**Fecha:** 2026-10-31. **Estado:** integración experimental; no certificar fuente/perímetro ambiental.
## Descubrimiento real
Se verificó `GetCapabilities` de `https://geoportal.salta.gob.ar/geoserver/wfs`: HTTP 200, 29 tipos WFS anunciados. La fuente oficial de referencia es IDESA Salta. Se detectaron tipos `geonode:municipios`, `geonode:otbn_2009_ll`, `geonode:unid_veg_cabral_etal_2009`, entre otros.

Consulta de prueba delimitada a Cachi (`[-66.3,-25.12,-66.1,-24.96]` en EPSG:4326):
- `geonode:municipios`: petición completa `maxFeatures=20`, **5/5 MultiPolygon**, **3.969 vértices**, **111.900 bytes** (observación QA, no tamaño contractual). Payogasta, Cachi, San Antonio de los Cobres, Seclantás y Campo Quijano.
- SHA-256 **de la respuesta WFS cruda de esa petición concreta** observado en QA: `c9b9ab35946b1506e173441e21ec85713ea6167acd220b5d6edb7aff80e810cd`. Puede cambiar al actualizar el organismo.
- `geonode:otbn_2009_ll` respondió MultiPolygon en ventana del Chaco salteño `[-63.2,-22.95,-62.75,-22.55]`. Con `maxFeatures=2`, el servicio reportó **11** coincidencias: respuesta incompleta, prohibido utilizarla para una exportación total.
- La respuesta WFS selecciona los polígonos que intersectan BBOX pero **no los recorta geométricamente**. El recorte físico posterior se realiza en AMBIENTA usando Turf.
- El WFS no anuncia `Access-Control-Allow-Origin` en las peticiones probadas. GitHub Pages no puede leerlo mediante `fetch` de navegador; por eso esta etapa ofrece enlaces WFS por BBOX hacia el proveedor, y exige **guardar e importar** el GeoJSON, sin proxy externo de confianza no autorizado.

## Política incorporada
1. Endpoints fijos y HTTPS, nombres de capa expresamente autorizados: municipios, OTBN 2009 y vegetación 2009.
2. BBOX WGS84 construida por coordenadas declaradas por operador, nunca identificada como huella oficial del proyecto.
3. `maxFeatures=20` limita descarga directa, **no garantiza completitud**. El validador bloquea `totalFeatures` / `numberOfFeatures` / `numberMatched` diferentes de `features.length` y `numberReturned` inconsistentes.
4. Solo se admiten archivos hasta 1 MiB, 100 entidades y 12.000 vértices. Polígonos con problemas de topología se marcan para revisión; la exportación parcial no se habilita.
5. El SHA-256 del archivo realmente importado se conserva en el navegador. Sus atributos arbitrarios se depuran; `name` o `nombre` se conserva como etiqueta legible.
6. No se copia ni redistribuye el conjunto de polígonos provinciales en GitHub Pages: el archivo procede directamente de IDESA cuando el operador descarga la consulta. **Licencia de cada capa por verificar en el geoportal** antes de otras formas de redistribución.
7. No se deduce la ubicación ni perímetro del proyecto Diablillos de los límites municipales, del OTBN ni de centroides administrativos.

## QA y siguiente fase
- Contratos Node: URLs allowlist, CRS/BBOX, rechazo de truncamiento, saneamiento de atributos.
- E2E Chromium: importar polígonos WFS reales desde el archivo de la respuesta original del proveedor, comprobar recorte topológico, SHA y preservación de la capa fuente.
- La automatización en un solo clic requiere un backend/proxy WFS con lista blanca, acotación de geometrías, límites de bytes, autentificación/cotas y seguimiento de fuente, o un endpoint oficial que habilite CORS.
- Estado de CI de la rama: consultar `.github/workflows/v3-wfs-qa.yml`. No afirmar PASS sin resultado del workflow.

**Fuente:** https://geoportal.salta.gob.ar/developer/
