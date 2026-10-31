# AMBIENTA V2 — AOI automática desde coordenadas (laboratorio)
**Fecha:** 2026-10-31. **Rama:** `feature/ambienta-aoi-recorte-automatico-2026-10-31`. **Caso QA:** Diablillos documental ficticio, sin coordenadas reales del proyecto.

## Alcance funcional
- En **Área de estudio**, ingresar latitud y longitud WGS84 (grados decimales) y una distancia nominal de consulta de 0,1 a 100 km.
- Sin pulsar un botón de recorte, al disponer de tres valores válidos se construye una **ventana rectangular** de búsqueda (BBOX EPSG:4326). El cálculo aproxima los grados usando 111,195 km/° y coseno de latitud; **no es un buffer geodésico exacto**, ni delimita la instalación, el área de impacto ni la cuenca.
- El rectángulo aparece en el mapa en color verde, y MapLibre enfoca su extensión.
- Cuando ya existe una capa GeoJSON local importada, AMBIENTA calcula su intersección con la ventana sin modificar ni sobrescribir el archivo original ni su SHA-256.
- Se recortan puntos, multipuntos, líneas, multilíneas y **polígonos simples convexos sin huecos**. Se omiten y contabilizan los polígonos no convexos o con huecos, porque recortarlos con un algoritmo simple podría producir topologías inválidas. Cuando hay omisiones, la descarga del recorte queda bloqueada.
- La descarga derivada GeoJSON incluye metadatos: `bbox`, método, recuentos, nombre y SHA-256 de la fuente local, y advertencia de no verificación. Se preserva la fuente original en `localStorage`.
- La ventana se conserva solo en el navegador con clave distinta para la demo Diablillos y la demo general; el botón **Quitar ventana** devuelve la capa original sin recorte.
- La selección territorial Georef y el polígono administrativo siguen siendo capas **contextuales**, no límites del proyecto. Los WMS raster y las bases OSM/IGN no se recortan geométricamente: sus proveedores reciben solicitudes de teselas correspondientes al visor.

## Fuera de alcance y controles
- **No se descarga automáticamente** ninguna base nacional ni se afirma haber obtenido un límite oficial de Salta.
- No se realizan intersecciones geodésicas exactas, reproyección de CRS, buffers reales, análisis de cuencas, mosaicos raster, simplificación topológica ni procesamiento de GeoPackage. Para eso se necesita un motor SIG servidor (PostGIS/GDAL/GEOS) y un contrato de fuentes oficiales verificadas.
- Si el AOI no intersecta la capa local, se muestra **0 entidades**; nunca se sustituye silenciosamente por la capa original.
- Si una capa contiene geometrías complejas, se muestra una advertencia explícita y no se permite descargar resultados incompletos como si fueran definitivos.
- No se suben coordenadas ni GeoJSON a Supabase. **La cartografía base externa sí puede recibir las solicitudes de teselas de la zona visible**, según la política del proveedor.
- Las pruebas usan coordenadas y geometrías **sintéticas**; no implican que esas coordenadas representen Diablillos.

## QA de esta rama
- `tests/react-v2/aoi-clip.test.mjs`: nueve casos sobre validación, antimeridiano, recorte de líneas, puntos, polígonos convexos, rechazo de geometrías complejas y conservación del original.
- `apps/web/scripts/diablillos-smoke.mjs`: Chromium comprueba entrada de coordenadas, actualización automática, BBOX local, aislamiento por caso, recarga, recorte de hidrología sintética, descarga GeoJSON derivada y preservación de la geometría original.
- La verificación en vivo del TMS IGN y la prueba Supabase RLS con dos usuarios **siguen pendientes** de etapas anteriores.

## Próxima fase de producción
1. Motor espacial PostGIS/GDAL/GEOS para recortar polígonos cóncavos, multipolígonos con huecos y grandes archivos de manera topológicamente segura.
2. Catálogo de capas con licencias, versiones, cobertura, escala, URL y hash verificables; consultas WFS/API por BBOX cuando el proveedor lo permita y ETL nacional indexado en servidor cuando no.
3. Separar tres geometrías: ventana de consulta, polígono del proyecto documentado y área de influencia hidroambiental técnicamente definida.
4. QA con polígonos reales institucionales y análisis de intersecciones, precisión y distorsión por CRS.

**Estado:** prototipo de recorte local y ventana por coordenadas; NO herramienta SIG regulatoria validada.
