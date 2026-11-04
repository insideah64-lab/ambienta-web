# Matriz de evidencias y aceptación — QA matrices AMBIENTA

Los códigos de estado reflejan **lo que se observó**, no una certificación metodológica. Tres pruebas TinyFish en navegador aislado de datos reales, proyecto `DEMO-001`. Las ejecuciones 1 y 2 confirmaron más operaciones que la 3; no mezclar resultados entre sesiones como si pertenecieran al mismo navegador.

| Área | Observación hasta 2026-11-04 | Estado | Reproducción/aceptación exigida a Codex |
|---|---|---|---|
| Leopold: estructura 7×4 | Confirmado en TinyFish 3 | PASS histórico | Verificar 7 factores, 4 acciones y diseño escritorio a 1366/1800 |
| Leopold: signo/M/I | `−7/5` en TinyFish 1; TinyFish 3 bloqueado | PASS histórico / NOT_RUN tercero | En sesión nueva editar UNA celda: `—` → `− · por valorar` → `−7/—` → `−7/5` |
| Leopold: diagonal, resumen | Ejecutado en TinyFish 1 | PASS histórico | E2E y regresión numerada; sumar únicamente interacciones validadas |
| Leopold: ponderación opcional | `7×5×1=35` en TinyFish 1 | PASS histórico | No alterar la celda `−7/5`, desglose adverso/beneficioso separado |
| Leopold: texto centrado | PR #82 CI PASS, TinyFish 3 en Pages lo observó arriba | CONFLICTO / FAIL reportado en producción | Capturas antes/después, computed style, texto real, caché, posición tras scroll/zoom, validación visual |
| Leopold: descarga JSON | Botón visible, sin archivo verificable en tercera sesión | NOT_VERIFIED | Evento de descarga y `JSON.parse` de archivo, contenido intacto |
| Leopold: añadir/renombrar | E2E previos, no completado en TinyFish 3 | NOT_RUN tercero | Test de nueva acción, renombre, ID y celdas conservados |
| Conesa F1 | `−34` importancia, moderado | PASS histórico | Recarga, fundamento, signos, persistencia y paridad |
| Conesa F2 | 1 tamiz, `1000 UIP` para siete factores | PASS histórico | Confirmar guardado/recarga; no confundir 1000 UIP con resultado de Leopold |
| Conesa F3a lineal | `0,8` SIN, `0,5` CON, `−0,3` delta | PASS histórico de cálculo | Con un factor completo: `1 de 7 calculables`, gráfico, números y fuentes |
| Conesa F3a contador | `0 de 7` reportado aun al citar un resultado de editor | CONFLICTO / NO CONFIRMADO | Determinar si registro incompleto, estado inicial o fallo de render |
| Conesa F3b: 3 nudos | `(0,0),(50,1),(100,0)` guardados | PASS guardado | Asegurar que el gráfico y el JSON representen los nudos reales |
| Conesa F3b: habilitar | 1 activa, 0 evaluables, 1 pendiente documental | BLOCKED esperado hasta validación | Con origen `estudio/expertos`, fuente, scope, asesor, evidencia, fechas y nudos válidos, esperar `0,4` SIN, `1` CON, `+0,6` delta |
| Conesa F2 UIP tras recarga | No confirmado | NOT_RUN | `page.reload()`, recuperar total 1000 |
| Conesa F3a JSON real | No confirmado | NOT_RUN | Download y parse con schema/proyecto y records |
| Pantalla azul/pez | TinyFish 3 hacia paso ~95 de 102 | BLOCKED / causa desconocida | Logs JS/Network, screenshots y DOM, comprobar repetibilidad; NO afirmar fallo de React sin evidencia |

## Dónde mirar
- PR #78 (constructor desde la tabla), #79 (vistas), #80 (Leopold unificado), #81 (cabecera compacta), #82 (texto centrado).
- `ImpactMatrixBuilder.css` contiene aún regla general `thead th span { display:block }` y nueva regla específica `thead th .amb-matrix-corner-label { display:flex; align-items:center }` (PR #82). El caso publicado contradictorio exige verificar CSS efectivo.
- `ConesaF3Comparison.tsx`: contador `valid.length` de `rows` con `record && result`; no debe mostrar 1/7 si falta la validación exigida.
- `ConesaF3CurveModel.ts::f3bProblems`: no desactivar validación documental para lograr el ejemplo; distinguir `origin='anejo4'` (exige página) de origen independiente de ejemplo.
- `v3/overrides/scripts/impact-matrix-builder-smoke.mjs` ya mide `Range.getBoundingClientRect()` y guarda `matrix-header-text-centered-1366.png`, `matrix-header-text-centered-1800.png`, `matrix-centered-overview-...`; la prueba verde **no fue suficiente para el usuario**.
- `v3/overrides/scripts/conesa-libro-f3a-smoke.mjs` y `conesa-libro-f3b-smoke.mjs` contienen fixtures de indicadores, fechas, fuentes y curvas; reutilizarlos sin generar fechas o fuentes reales.

## Requisitos de entrega
1. Capturas verificadas manualmente de la versión antes y después, con viewport y commit concreto registrados, a 1366 y 1800.
2. Tests de navegador deterministas y tests numéricos, sin falsa marca PASS por mera visibilidad.
3. Árbol limpio / hashes de V1 y V2 conservados; esquemas locales y exportables compatibles.
4. Informe de pruebas con PASS/FAIL/BLOCKED/NOT_RUN, causa raíz, commits, PR y resultado de Pages.
5. Si queda trabajo, un nuevo documento de continuidad en esta carpeta y registro de HOLD.
