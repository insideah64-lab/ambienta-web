# 12 · Ajuste de densidad y alineación de Leopold (PC)

Fecha: 2026-11-04. Rama: fix/codex-matrices-qa-2026-11-04. Base: 04e699a0e74477d39843c74a1a5ebce1fa0e4ea7. PR #85.

## Problema y solución
La captura del usuario mostró una primera columna sobredimensionada, filas altas y franjas sin contenido entre botones. La tabla combinaba width:max-content/min-width:100% con anchos por celda: el espacio sobrante ensanchaba también la primera columna. Los controles de fila estaban debajo del nombre y aumentaban la altura de toda la fila, mientras el botón evaluable conservaba su propia altura mínima.

Se usa un colgroup de 240 px para componentes y columnas de acción que comparten el ancho restante. Ancho mínimo calculado: 240 + 170 × acciones, con scroll interno cuando hace falta. Controles de fila junto al nombre/grupo; botones evaluables ocupan toda la altura. Nombres de acción y esquina centrados; nombres de componente alineados a la izquierda para lectura. Se preservan tabla semántica, encabezados sticky, nombres accesibles, foco, teclado, edición, cálculos y almacenamiento.

## Verificación local
- PASS: build V3 y TypeScript.
- PASS: 224/224 pruebas unitarias existentes.
- PASS: matrix-workspace-smoke a 1366/1800, navegación normal/ampliada, editor cerrado/abierto, recarga y JSON leído. Primera columna 240 px exactos; filas iniciales 65 px; separación botón/celda 1 px (borde); diferencia de centros del texto <1 px en ambos ejes. Regresión geométrica incorporada al script existente y al CI existente.
- PASS: impact-matrix-builder-smoke a 1366/1800: editar/agregar ejes, Leopold, ponderación exploratoria, recarga, CSV/JSON y expediente intacto.
- PASS: demo-project-matrices-smoke local a 1366/1800: Leopold −7/5; Conesa F1 −34; F2 1000 UIP; F3a −0,3; F3b +0,6; 1/11 calculables; descarga/lectura de 22 archivos JSON/CSV. Son controles QA sintéticos explícitos, no mediciones ambientales del expediente.
- PASS: diagnóstico P0 actual en 1366/1800, scroll, zoom 125%, navegación, DOM y descargas; sin errores JS/red. Esto no demuestra la causa del incidente histórico.
- PASS: capturas completas y ampliadas generadas, abiertas y revisadas visualmente antes de entregar. Se revisó la tabla inicial, ampliada, con editor y valoración −7/5.
- BLOCKED_NOT_REPRODUCED: incidentes históricos del encabezado y pantalla azul con pez. Este ajuste atiende el defecto visual observable en la nueva captura del usuario; no atribuye una causa a esos incidentes.
- NOT_RUN: teléfono, excluido por el usuario. No se usaron TinyFish ni servicios pagos.

## Evidencias y continuidad
Artefacto CI existente incluye qa/ambienta-matrix-workspace/ (density-initial, density-expanded, density-expanded-with-editor, initial y editor en ambos anchos). Evidencia local adicional: qa/matrices-handoff/density-after/ y qa/ambienta-demo-project-matrices/local/. Resultado definitivo del CI completo: ver checks del PR #85 y su descripción actualizada. Publicación permanece en HOLD; no merge ni despliegue.

## Herramientas consultadas
Data Visualization: matriz tabular para comparar cruces, ruta de layout/QA; DOM nativo como renderer, sin estado nuevo ni dependencias. Lumen UI: contrato Table y reglas de espaciado/propiedad de bordes consultados; paquete no instalado, sin migración del componente especializado. Context7: documentación MDN sobre table-layout fixed, colgroup y vertical-align. GitHub: HEAD verificado antes de editar y cambios integrados en la rama del PR.
