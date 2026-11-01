# AMBIENTA V3.9 — Estaciones de muestreo y referencias SIG (experimental)
Fecha: 2026-11-01. Rama: `feature/ambienta-v39-estaciones-sig-2026-11-01`; [PR #13 borrador](https://github.com/insideah64-lab/ambienta-web/pull/13) apilado sobre V3.8 #12. **No desplegado**.

## Propósito
Relacionar una estación que ya existe como `stationId` de mediciones activas V3.8 con una referencia puntual `F1`, `F1:P1` etc. de una capa GeoJSON ya clasificada en V3.5. El vínculo es documental y requiere elegir **ambas referencias**, declarar fuente y precisión y obtener revisión humana independiente. No convierte nombres en latitud/longitud, no agrega valores químicos ni atribuye impactos.

## Implementación
- `v3/overrides/src/features/maps/station-links.mjs` define `ambienta-station-point-links-v1` con registros aislados en localStorage (Diablillos o DEMO). El libro está ligado a proyecto, revisión del dominio, revisión de mediciones, SHA-256 de la capa, SHA-256 del escenario, BBOX, generación y CRS EPSG:4326.
- El clasificador vuelve a derivar la clasificación de puntos de la fuente vigente mediante `analyzePointsInStudyAreas`. Conserva huecos, multipolígonos, bordes, salientes cóncavos y revisión de topología, en vez de fiarse solo de un rótulo de zona.
- Un candidato exige stationId con **alguna medición activa y no anulada**, pointRef real, identificador de fuente, método de geolocalización declarado, fecha de ubicación, precisión en metros, persona proponente y momento del registro.
- `boundaryDistance` se reutiliza de V3.6: aproximación local con margen conservador 25% para precisión declarada, sin sustituir topografía, geodesia o certificación instrumental. Si la precisión abarca un borde, un hueco o zona ambigua, queda `needs_spatial_review` y **no es aceptable**. Los exteriores tampoco son aceptables.
- Los interiores quedan `awaiting_review`. La aceptación (`accepted_qa`) o rechazo requiere motivo, fecha y nombre de revisor **distinto del proponente**. Una etiqueta de aceptación significa solo decisión local en QA, no validación fáctica de coordenadas.
- El registro es derivado, exportable a JSON sin coordenadas (estas siguen en el GeoJSON original), no toca mediciones, inspecciones, evidencias, PGA ni expediente. La alteración de cualquier revisión o fuente vuelve obsoletos los vínculos y bloquea nuevas escrituras hasta reconstruir el caso mediante el procedimiento que preserve el original.
- `StationLinkPanel.tsx` + `station-links.css` se muestran exclusivamente en Mapas y SIG debajo del análisis V3.5 y revisión documental V3.6/3.7. Área de estudio mantiene exclusiva la delimitación del territorio; Monitoreo V3.8 mantiene exclusiva la introducción de muestras.

## QA
- `tests/react-v3/station-links.test.mjs`: registro sin datos ficticios añadidos, selección manual, rechazo de autovalidación, geometría exterior y límites, error declarado que cubre bordes, invalidación por revisión de muestra, detección de corrupción de estado y referencia SIG falsa.
- `v3/overrides/scripts/station-links-smoke.mjs`: Chromium crea una muestra sintética en Monitoreo y una capa de puntos sintéticos en Mapas y SIG, propone una relación, bloquea autovalidación, registra aceptación QA por otro nombre, exporta el resultado y comprueba que no cambia medición ni GeoJSON; luego anula la medición explícitamente y comprueba que el enlace quedó obsoleto.
- `.github/workflows/v3-preview.yml` incluye el recorrido y las regresiones V3.5–V3.8, builds V1/V2, SHA y Chromium. **No declarar PASS hasta leer el resultado final.**

## Límites para uso profesional
La plataforma no acredita el origen de la capa, la autenticidad de la persona revisora, la fecha y precisión reales del GPS, los límites geodésicos ni la existencia física de una estación. Un SHA declarado en metadatos no prueba la adquisición de datos original. El enlace se basa en clasificación topológica local, no geodesia de precisión ni verificación en campo. No asignar cumplimiento, incumplimientos, medidas, impactos ni evidencia a partir de proximidad.
Los próximos requisitos son autenticación/autorización, políticas de custodia de fuentes, verificación y validez de CRS/precisión instrumental, tratamiento de datos de localización sensibles y un procedimiento de revisión profesional auditable.

## Continuidad y protección
- V3.5 pública sigue estable; V3.6, V3.7, V3.8 y V3.9 permanecen en PR separados, sin fusionar.
- Primer respaldo: `backup/ambienta-v39-estaciones-checkpoint-2026-11-01`.
- Conservar cambios y hashes V1/V2.


## Integración de consulta desde Monitoreo (posterior al primer checkpoint)
- `v3/overrides/src/features/monitoring/StationLocationSummary.tsx` muestra una vista **solo lectura** de las propuestas, que vuelve a analizar puntos y a validar mediciones y escenario con las fuentes locales.
- Cuando la capa original no está accesible desde Monitoreo (por ejemplo, importación puntual temporal solo en memoria de Mapas y SIG), **no** indica vínculos verificados ni reutiliza la ubicación; invita a reimportar el GeoJSON en el módulo GIS. Esto impide adjudicar coordenadas no conservadas en expediente.
- `MeasurementWorkbench.tsx` emite `ambienta:measurements-updated` al guardar/anular para invalidar la vista inmediatamente. No modifica el dominio V1/V2 ni crea datos ambientales.
- `station-links-smoke.mjs` comprueba la consulta y su invalidez al anular una muestra en la misma sesión.
