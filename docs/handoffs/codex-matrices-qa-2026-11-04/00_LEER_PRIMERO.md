# AMBIENTA — Handoff maestro a Codex: QA y corrección de matrices
**Fecha:** 2026-11-04  
**Repositorio de código:** `insideah64-lab/ambienta-web`  
**Rama documental de traspaso:** `handoff/codex-matrices-qa-2026-11-04`  
**Base verificada:** `main` @ `98a4f3b7cfd196f287eba2a161516bdac1e663c3`  
**Web publicada:** https://insideah64-lab.github.io/ambienta-web/v3/#/matrices  
**Publicación Pages verificada:** run `41869294822`, `success`, sobre la base anterior.  
**PR #82:** fusionado, `98a4f3b7...`, pero el defecto visual NO puede declararse cerrado en la web real.

## Empezar aquí
Leer `01_PROMPT_CODEX.md` y `02_EVIDENCIAS_Y_CRITERIOS.md` de esta misma carpeta. No repetir el desarrollo completado. Este handoff es un registro del estado confirmado y de los problemas abiertos; no autoriza dar por corregidos fallos por tener CI verde.

## Decisiones de producto ratificadas
1. **Una única Matriz de Leopold integrada**, sin alternar Identificación/Leopold. Identificar `-`/`+` y valorar magnitud (1–10) e importancia (1–10) en la **misma celda**; `—` no evaluada, `∅` sin interacción, `− · por valorar`, `−7/—`, `−7/5`. Diagonal M/I opcional; resúmenes por factores y acciones. La ponderación `M×I×peso` es **exploratoria, opcional y no normativa**; no equivale al método clásico ni a Conesa.
2. **Conesa es un único método** con cuatro solapas internas, no cuatro métodos separados: F1 «Valorar impactos», F2 «Depurar y ponderar», F3a «Calidad ambiental», F3b «Curvas». Estas siglas son de AMBIENTA, no la nomenclatura oficial del autor.
3. F3a es el espacio SIN/CON proyecto y gráfico comparativo; F3b es el taller de curvas/documentación M→CA, sin duplicar la comparación. F3a/F3b comparten el mismo borrador de indicador y escenarios, no dos copias.
4. Preservar `localStorage`, esquemas, IDs, exportación CSV/JSON, documentación y V1/V2. Nunca dar valores automáticos como mediciones reales ni compensar impactos positivos/negativos para anunciar aprobación ambiental.

## Evidencia: tres recorridos TinyFish (navegador limpio, DEMO-001)
- **Primero** https://agent.tinyfish.ai/runs/55cd5c09-55f7-410d-b24c-a62309a5c4ba  
  Leopold: cruce adverso `−7/5`, resumen 1 adverso completo, diagonal, ponderación ilustrativa `35,00`; el agente informó persistencia tras recarga. Conesa: F1 `−34` (moderado) y cuatro solapas accesibles. Descarga JSON de Leopold no demostrada aquí.
- **Segundo** https://agent.tinyfish.ai/runs/ea5eb73e-1aaf-452a-861f-775c3457b360  
  Conesa F1 `−34`; F2 tamiz de una interacción y ponderación de siete factores con **1.000 UIP**; F3a recta decreciente con SIN=20, CON=50, dominio 0..100: `CA_SIN=0,8000`, `CA_CON=0,5000`, `ΔCA=-0,3000`. F3b guarda tres nudos `(0,0)`, `(50,1)`, `(100,0)`, pero 1 curva activa, 0 evaluables, 1 pendiente de revisión: **no se comprobó interpolación habilitada**. Informó persistencia F1/F3a/nudos F3b después de recarga; no verificó de nuevo los 1.000 UIP tras recarga. Informó descarga JSON de curvas; volver a demostrar de manera automatizada.
- **Tercero** https://agent.tinyfish.ai/runs/efe91e9f-546e-4f0b-8eb8-b2836db43a82  
  **102 pasos; estado de ejecución completed** con prueba funcional parcialmente bloqueada. La versión publicada fue reportada con «Componente ambiental» aún pegado arriba (FAIL visual); la estructura 7 factores × 4 acciones y el inspector separado (PASS). Hacia el final apareció una pantalla azul con pez animado / carga persistente, lo que impidió completar valoración, exportación y F3a. **Causa no determinada**: podría ser error cliente, espera del agente, recarga/estado de navegación o problema de recursos. La tercera sesión NO revoca las verificaciones numéricas anteriores, pero tampoco demuestra que el defecto visual esté resuelto.

### Contradicciones ABIERTAS, no maquillar como aprobadas
- **PR #82 + Playwright/CSS**: CI SUCCESS y capturas locales a 1366/1800 verificaron centrado del texto, pero TinyFish sobre Pages publicado siguió viendo el título arriba. Investigar caché/versión, CSS computado, diferencias de navegador/zoom/scroll, captura y DOM reales antes de asegurar solución; preferir observación visual completa sobre una única aserción de geometría.
- **Conesa F3a**: otra sesión reportó valores CA válidos en el inspector y «0 de 7 factores calculables» en el resumen. `ConesaF3Comparison.tsx` calcula `valid = rows.filter(row => row.record && row.result)`; debería pasar a «1 de 7» si `rows` contiene el resultado vigente. **No está confirmado que sea un bug**: comprobar dependencias, modo activo, validación, guardado y actualización de estado.
- **F3b**: el bloqueo de una curva incompleta puede ser CORRECTO. El modelo `f3bProblems()` valida indicador, unidad, composición, vínculo con F3a, origen/página del Anejo 4 (si aplica), fuente, ámbito, evaluador, evidencia, nudos, fechas, fuentes SIN/CON y dominio. No desactivar validaciones para hacer pasar una demo; mostrar qué falta y completar un caso sintético con origen adecuado.
- **Exportaciones y persistencia**: JSON Leopoldo y JSON F3a no fueron confirmados por la tercera sesión. F2 UIP=1000 tras recarga sigue NOT_RUN. Validar con descargas reales `acceptDownloads` y JSON parseado, no por presencia de botón.
- **Pantalla azul con pez**: clasificar solo después de pruebas con console errors, `pageerror`, requests fallidas, screenshot + DOM, reproducibilidad con navegador limpio y caso sin agente.

## Rutas de código prioritarias
`v3/overrides/src/features/impacts/ImpactMatrixBuilder.tsx` / `.css`  
`v3/overrides/src/features/impacts/LeopoldAnalytics.ts`, `LeopoldSummaryPanel.tsx`, `LeopoldReviewPanel.tsx`  
`v3/overrides/src/features/impacts/ConesaLibroPanel.tsx`, `ConesaF2Panel.tsx`, `ConesaF2Model.ts`  
`v3/overrides/src/features/impacts/ConesaF3Panel.tsx`, `ConesaF3Comparison.tsx`, `ConesaF3Model.ts`  
`v3/overrides/src/features/impacts/ConesaF3CurveEditor.tsx`, `ConesaF3CurveModel.ts`  
`v3/overrides/scripts/impact-matrix-builder-smoke.mjs`, `leopold-workbook-parity-smoke.mjs`, `conesa-libro-f2-smoke.mjs`, `conesa-libro-f3a-smoke.mjs`, `conesa-libro-f3b-smoke.mjs`  
`tests/react-v3/*.test.mjs`, `.github/workflows/v3-preview.yml`, `.github/workflows/pages.yml`.

## Contratos de datos que NO se deben romper
- Leopold: `ambienta.impact-matrix.v1`, prefijo `ambienta-impact-matrix-v1:<projectId>`. Celdas `sign: -1|0|1`, `magnitude: number|null`, `importance: number|null`, `reason`, `evidence`.
- Conesa: prefijos existentes `ambienta-conesa-libro-1997-f1:`, `-f2:`, `-f3a:`, `-f3b:` y archivos históricos. El año del ID técnico **no es un botón de versión nuevo**.
- Proteger los datos del usuario: en QA usar contexto Chromium limpio y `DEMO-001`, no tocar su almacenamiento personal.

## Cierre que debe entregar Codex
Informe con **PASS/FAIL/BLOCKED/NOT_RUN** por caso y diferencia entre CI local, navegador Pages y evidencias TinyFish; causas reales, commits, PR(s), capturas antes/después a 1366 y 1800 px (inspeccionadas, no solo guardadas), tablas numéricas y pruebas de recarga/descarga; integridad V1/V2. Si encuentra un error reproducible, corregirlo con pruebas de regresión, CI y PR. Integrar/publicar solo con CI completamente verde y verificar la versión publicada. Dejar un nuevo handoff en esta carpeta si alguna cuestión sigue abierta.
