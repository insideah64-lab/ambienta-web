# AMBIENTA V3.6 — Revisión de registros georreferenciados (experimental)
Fecha: 2026-11-01. Estado: rama experimental, PR #10 en borrador. NO publicado en GitHub Pages.

## Objetivo y límites
Se mantiene la división V3.4: Área de estudio define territorio, Mapas y SIG clasifica geometrías y deriva propuestas; Monitoreo consulta un **resumen local** sin alterar el expediente. No se fusionan el registro espacial manual V3.3 ni el análisis topológico V3.5 con el registro del dominio.

## Contrato de entrada
Primero se ejecuta V3.5 sobre la capa puntual original, sin reemplazar el perímetro de Área de estudio. En SIG se importan registros como JSON `{"schema":"ambienta-monitoring-input-v1","records":[...]}`, máximo 256 KiB y 1.000 registros.

Cada registro requiere `id` único, `pointRef` (identificador F1, F1:P1, etc., asociado al reporte puntual), `recordType` (monitoring | inspection), `observedAt` (fecha-hora), `method`, `sourceUri`, `sourceId`, `accuracyMethod`, `accuracyMeters` numérico finito no negativo y `evidenceSha256` hexadecimal de 64 caracteres. Un SHA **declarado** no demuestra autenticidad del documento, ni que la medición ocurriera. El usuario debe evaluar las fuentes y licencias de cada registro real. No se envían datos a un servidor.

## Tratamiento espacial conservador
Se comprueba el estado del punto en V3.5 y, para cada punto interior, se estima la distancia mínima a los segmentos de bordes exteriores, límites interiores y bordes de huecos del escenario. El cálculo usa una aproximación local en metros y añade 25% de margen a la precisión declarada. Si el radio alcanza un borde, la asociación no se propone; también se bloquean puntos exteriores, sobre bordes o en referencias inexistentes. No sustituye al análisis geodésico, ni un levantamiento topográfico, y debe reevaluarse antes de aplicaciones reales con coordenadas de alta precisión o geometrías extremas.

Estados derivados: `needs_metadata`, `needs_spatial_review`, `awaiting_review`, `approved`, `rejected`. Las dos decisiones finales requieren nombre de revisor, motivo y fecha. «approved» significa **aceptación local para vínculo QA**, no verificación de laboratorio, inspección en campo, aprobación administrativa o cumplimiento ambiental.

Los resultados guardan identificadores de fuente, fecha, método, precisión, distancia estimada a bordes, SHA de procedencia de puntos y escenario, y una declaración de límites. Son exportables por separado sin modificar los datos originales.

## Resumen de Monitoreo
El guardado es **explícito**, solo localStorage, incluye estados e IDs y omite coordenadas y registros originales. El módulo Monitoreo valida formato, proyecto DEMO, escenario, BBOX, generación, estados y revisiones; si cambian, muestra «obsoleto» y no reutiliza vínculos. El archivo original de puntos NO puede verificarse independientemente desde Monitoreo; es una vista de resumen y no una fuente oficial. El usuario debe volver a SIG y a la fuente original para una auditoría real.

## Validación
- `tests/react-v3/documentary-links.test.mjs`: contratos, márgenes de incertidumbre, fuentes, revisión humana, inmutabilidad y obsolescencia.
- `tests/react-v3/documentary-summary.test.mjs`: lectura acotada, bloqueo de corrupción o revisión ficticia y escenario cambiado.
- `v3/overrides/scripts/documentary-review-smoke.mjs`: Chromium: 10 puntos, 4 propuestas pendientes, 6 bloqueos, ninguna aprobación automática; revisión manual de una propuesta, exportación, resumen en Monitoreo e invalidación tras editar el AOI.
- `.github/workflows/v3-preview.yml`: conserva build de V1/V2 y verificaciones SHA y añade el flujo Chromium de V3.6.

## Criterios para madurar hacia producción
No fusionar hasta que CI, Chromium y revisión del comportamiento móvil pasen. Antes de uso profesional faltan: autenticación e identidad verificable del revisor, documento real almacenado con verificación criptográfica (no solo SHA declarado), permisos de lectura, conservación controlada, vínculo al modelo de datos con claves existentes, CRS y error espacial del instrumento validado, licencias, tratamiento de datos sensibles, y validación humana de procedencia y autoridad. GEOS remoto, colas/cuotas por identidad y verificación de licencias IDESA permanecen trabajos independientes.

## Respaldo
Checkpoint inicial: `backup/ambienta-v36-gis-review-checkpoint-2026-11-01`.
Rama de trabajo: `feature/ambienta-v36-revision-documental-2026-11-01`.
PR: https://github.com/insideah64-lab/ambienta-web/pull/10
