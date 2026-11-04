# AMBIENTA — Matriz de Leopold unificada

Fecha: 2026-11-04. Solicitud: integrar Identificación y Leopold en **una sola matriz**, sin obligar a cambiar entre dos vistas para completar una misma interacción.

## Decisión de interfaz

La herramienta principal se denomina **Matriz de Leopold**. Hay una sola grilla, un único modelo persistido, un inspector junto a las celdas y un resumen continuo.

- **Sin evaluación:** `—`; no significa ausencia de impacto.
- **Sin interacción declarada:** `∅`.
- **Impacto identificado y todavía no valorado:** `− · por valorar` o `+ · por valorar`.
- **Valoración parcial:** `−7/—`, `+—/5` y equivalentes. No confundir con cero ni con valoración completa.
- **Valoración completa:** `−7/5` = magnitud adversa 7 e importancia 5, ambas de 1 a 10. Opción de diagonal clásica disponible sin cambiar de modo.
- Los fundamentos y la evidencia documental se editan en el mismo inspector y se conservan al navegar por celdas.
- Las tablas y alertas del resumen de Leopold quedan disponibles permanentemente, no condicionadas a un interruptor adicional.

## Ponderación exploratoria

No se elimina el trabajo anterior: `Herramientas complementarias` permite desplegar, bajo la matriz, una tabla *de solo lectura* con `magnitud × importancia × peso` por factor y conteos. En este informe se separan resultados adversos y beneficiosos y no se proclama un saldo ambiental o índice de aceptación. No se sustituye el texto de las celdas ni la puntuación clásica de Leopold.

## Preservación

- Sin cambios de esquema `ambienta.impact-matrix.v1`, clave `ambienta-impact-matrix-v1:<projectId>`, identificadores de ejes o cargas JSON.
- Sin migración, reescritura, sustitución automática ni borrado al abrir la herramienta.
- CSV de matriz, exportación JSON, construcción de filas/columnas, archivo de revisión y controles del registro técnico continúan usando el mismo modelo.
- La ponderación es una elaboración didáctica de AMBIENTA, no el puntaje oficial de la matriz clásica ni la fórmula de Conesa.
- Nunca se crean magnitud/importancia automáticamente al identificar una interacción.
- El análisis se limita a una herramienta de apoyo: no es un dictamen o aprobación ambiental.

## Pruebas y fotos

- `impact-matrix-builder-smoke.mjs`: comprobar que no existen botones de modo principal, identificar signo sin puntaje, registrar magnitud parcial y completa en **la misma celda**, resumen de Leopold y recarga; abrir/cerrar el análisis ponderado sin afectar la celda, diagonal, JSON/CSV, construcción de ejes, preservación de evidencia, 1366/1800px sin desbordes.
- `leopold-workbook-parity-smoke.mjs`: comprobar paridad de 50 interacciones del ejemplo Excel sin cambiar modo, con sumas por filas/columnas y alertas profesionales.
- Capturas de Chromium para matriz vacía, interacción totalmente valorada e informe complementario.
- Gate: CI completo y capturas antes de fusionar; comprobar publicación GitHub Pages después del merge.

Las siglas internas y los indicadores de prueba siguen etiquetados para asegurar continuidad histórica; no se presentan como herramientas separadas en la UI.
