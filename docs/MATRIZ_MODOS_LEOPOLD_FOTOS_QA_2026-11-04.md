# AMBIENTA · Diferencia entre Identificación, Leopold y Ponderación exploratoria

**Motivo (2026-11-04):** La barra anterior tenía tres botones contiguos, como si fueran tres metodologías equivalentes. El usuario reportó que parecía no funcionar y pidió fotos de prueba.

## Hallazgo

Los botones ya alternaban la visualización de **una sola** matriz y no creaban otras matrices. Las celdas sin calificar muestran un guion `—` en los tres modos, por lo que pasar de Identificación a Leopold daba la impresión de que no ocurrió nada. Se comprobó con las capturas de la prueba de navegador del PR #78 (1366 y 1800px): una interacción adversa con magnitud 7 e importancia 5 mostraba `−` en Identificación, `−7/5` en Leopold y `-35` en Ponderación con peso 1. Es un ejemplo del laboratorio QA, **no datos medidos de ningún expediente**.

## UI corregida

- **1 · Identificación** y **2 · Leopold** son las dos etapas visibles principales. La primera marca presencia, signo o ausencia de interacción; la segunda muestra la magnitud y la importancia como criterios distintos y ofrece el resumen de Leopold.
- **Ponderación exploratoria** pasa a `Opciones avanzadas`. No es un método de Conesa ni parte del índice clásico de Leopold. Sigue disponible para preservar el trabajo previo, sin tocar ni migrar valores ni esquemas.
- Explicaciones distintas por vista, incluyendo una advertencia explícita en Leopold si todavía no hay interacciones totalmente valoradas: el cambio de vista puede parecer nulo porque todas las celdas están sin evaluar.
- Se muestra un **ejemplo ficticio etiquetado** (`−`, `−7/5`, `−35`) para ilustrar qué debería aparecer. Nunca se inserta en el archivo de trabajo.
- Se mantiene la misma clave `ambienta-impact-matrix-v1:<projectId>`, los tres modos internos y toda la persistencia / CSV / JSON. La vista experimental tiene un botón para volver a Leopold.

## QA y evidencia visual

- El Playwright de `impact-matrix-builder-smoke.mjs` prueba los tres valores reales de representación, comprueba que la opción avanzada esté contraída, el estado de Leopold vacío y el retorno desde la opción avanzada. Genera **seis nuevas capturas** (`matrix-mode-identificacion-[1366|1800].png`, `matrix-mode-leopold-[1366|1800].png` y `matrix-mode-exploratoria-[1366|1800].png`).
- `leopold-workbook-parity-smoke.mjs` abre el botón renombrado sin tocar la paridad numérica.
- Tests de compilación, regresión V3 y preservación V1/V2 se mantienen intactos.
- **No publicar hasta CI SUCCESS**; confirmar el despliegue en GitHub Pages.

## Limitaciones

Las capturas E2E provienen de un navegador Chromium de pruebas con datos de laboratorio; no son una sesión de navegador del usuario ni verifican los valores de su almacenamiento local. La página pública requiere actualización si conserva recursos en caché.
