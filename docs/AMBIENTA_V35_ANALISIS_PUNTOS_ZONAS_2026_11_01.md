# AMBIENTA V3.5 — puntos frente a subáreas del caso de estudio

**Ámbito:** laboratorio cartográfico de Mapas y SIG, datos derivados locales y explícitamente **SIMULADOS, NO OFICIALES**. Sin cambios en el expediente original V1/V2, credenciales, backend IDESA ni vínculos documentales del PGA.

## Propósito y separación de módulos

Área de estudio (`#/area`) define la ventana de consulta, un polígono de ensayo válido y sus cuatro subáreas A–D. Mapas y SIG (`#/mapas`) recibe esas geometrías como capas de referencia de solo lectura y permite importar un archivo GeoJSON puntual para analizar **dónde cae cada punto**.

No hay un segundo editor de perímetros, de ventana o de subáreas en SIG. Tampoco se convierte automáticamente el resultado espacial en una localización de impacto, inspección o evidencia. Las asociaciones documentales manuales V3.3 permanecen separadas.

## Método y resultados

La operación admite exclusivamente FeatureCollection de **Point/MultiPoint** EPSG:4326 ya importados en la herramienta SIG (el límite de la capa sigue siendo 100 entidades y 12.000 vértices). Cada punto obtiene una referencia determinista F1, F2…; los componentes MultiPoint usan F1:P1, F1:P2.

Se calcula la relación geométrica con el perímetro original y luego con cada subárea A–D:
- **inside_zone:** un único interior de zona confirmado sin estar en sus límites;
- **outside_perimeter:** punto fuera de la geometría de ensayo, incluyendo sus huecos y las muescas cóncavas;
- **review_boundary:** punto sobre el borde exterior, de un hueco o de una subárea, o a una distancia dentro de la tolerancia EPSG:4326 (1e-9°): no se fuerza un lado del límite;
- **review_topology:** conflicto de solapamiento o falta de cobertura de las subáreas para un punto interior, siempre pendiente de revisión.

Las subáreas pueden ser Polygon o MultiPolygon. Se aplica prueba de cruce de rayos y detección explícita de segmento para anillos. Las relaciones en límites nunca se asignan automáticamente: la tolerancia angular del laboratorio no equivale a un control de precisión instrumental, datum ni mensura geodésica.

El mapa MapLibre muestra una **superposición de puntos derivados en memoria** con las categorías de colores A ámbar / B cian / C violeta / D verde, gris para exteriores y naranja para revisión. También hay tabla filtrable, contadores y descarga JSON con todos los puntos, coordenadas, origen SHA-256, alcance del hash, BBOX, huella del escenario, método y advertencias. No se guarda esa capa derivada en `localStorage`, ni se reescribe el GeoJSON importado.

## QA de ensayo

1. Definir ventana (-24,70°, -67,20°, distancia nominal 5 km) y generar el perímetro sintético A–D en Área.
2. Ir a SIG, importar el archivo puntual ficticio y pulsar **Analizar puntos contra las subáreas**.
3. Comprobar 10 puntos: **4 dentro** (uno en cada zona), **3 afuera** (hueco, muesca cóncava, exterior) y **3 para revisión** (borde exterior, borde de hueco y límite entre zonas).
4. Exportar JSON y comparar SHA-256 de la fuente, geometrias fuente sin modificar, estados de puntos y suma de contadores.
5. Regresar a Área, cambiar BBOX y confirmar que SIG no ofrece ninguna asignación anterior, que se oculta la superposición y que el informe debe recalcularse contra el contexto actual.

**Pruebas:** `tests/react-v3/point-zone-analysis.test.mjs` (módulo puro) y `v3/overrides/scripts/point-zone-analysis-smoke.mjs` (Chromium), incluidas en `.github/workflows/v3-preview.yml`. El pipeline preserva los hashes originales V1/V2 y ejecuta los ensayos previos de cartografía, subáreas, IDESA simulado, Georef y los 16 vínculos documentales del caso.

## Restricciones científicas

La clasificación espacial **no** demuestra que exista una estación, que se haya efectuado una medición, que la coordenada represente un punto de impacto real, que un PGA se haya ejecutado ni que existan permisos o conformidad ambiental. Una fuente con SHA-256 identifica los bytes de origen en el contexto del navegador, pero no su autenticidad ante la autoridad. Para uso profesional se necesitarán metadatos verificables, permisos/licencias, CRS/proyección y precisión declarados, revisión de fronteras y relaciones topológicas apoyadas en cartografía validada. Un JSON exportado puede contener coordenadas sensibles.
