# Continuidad de QA: ejecución Codex, contraste original y HOLD

Fecha: 2026-11-04 (Argentina). [PR #85](https://github.com/insideah64-lab/ambienta-web/pull/85), rama `fix/codex-matrices-qa-2026-11-04`.

## Base y cambios

Se recuperaron y leyeron de `main` los cuatro documentos obligatorios antes de editar código. HEAD comprobado: `841f1356f86a3561be70fb0d3c7ce961a8d3640b`, padre `98a4f3b7cfd196f287eba2a161516bdac1e663c3`. El primer commit remoto de regresiones es [`c2909a3`](https://github.com/insideah64-lab/ambienta-web/commit/c2909a3995b5b44a84f61dff5d969a8c89ff4e53). [`d0cac36`](https://github.com/insideah64-lab/ambienta-web/commit/d0cac36477dd7b6c56e72e191112cc92325fae0c) incorpora contraste, capturas, descargas y corrección de alcance; [`97d5fe9`](https://github.com/insideah64-lab/ambienta-web/commit/97d5fe9b1bab21933e1ea3f12d87a0bfe4e6402f) refuerza detección de errores HTTP/red. El commit posterior solo actualiza esta instantánea documental. Consultar la pestaña Commits del PR para el HEAD de entrega.

Se reforzaron pruebas Playwright existentes y se agregó `matrices-p0-diagnostic.mjs`. Las pruebas prioritarias usan el demo ficticio `DEMO-001`, Chromium limpio y almacenamiento aislado. Los JSON/CSV se descargan, leen y comprueban como archivos; no se infiere éxito por la presencia del botón. Se conserva también la prueba de recuperación de documentos dañados sin sobrescribirlos. El único cambio de producto corrige una introducción textual desactualizada en Conesa: F2 ya ofrece depuración/UIP, mientras Vj e impacto total siguen ausentes. No se alteró CSS ni el motor metodológico para aparentar corrección de un fallo no reproducido.

## Matriz de resultados de esta sesión

| Caso | Estado | Evidencia y límites |
|---|---|---|
| Lectura de handoff, HEAD y rama nueva | PASS | Base y rama arriba; los cuatro originales se conservan. |
| Leopold 7 factores × 4 acciones e inspector separado | PASS | Local y Pages, 1366/1800. Tabla completa capturada aparte de la vista original con scroll. |
| Encabezado desalineado reportado por TinyFish | BLOCKED | No reproducido. Se abrieron capturas completas y ampliadas de local/Pages. Texto centrado verticalmente en las condiciones ensayadas; no afirmar «arreglado definitivamente». |
| CSS, texto y píxeles del encabezado | PASS acotado | Celda 75 px; caja Range de texto 16 px; diferencia de centros ≈−0.594 px. Píxeles claros de letras en capturas DPR1: centro a 1–2 px por debajo del centro de la imagen de cabecera, no pegado arriba. `pixel-centres.json`. Scroll, zoom CSS 125% y DPR2 local revisados. |
| Assets/caché de Pages | PASS acotado | Rama `gh-pages` en `ea7460f225e736e3acf995b35648d1d19852bd74`, mensaje `Deploy AMBIENTA 841f1356…`. SHA-256 de JS/CSS descargados coincide exactamente con esos archivos en la rama publicada. No se observó recurso obsoleto en esta sesión. Cabeceras de caché conservadas en diagnóstico; esto no prueba qué recibió TinyFish en el recorrido histórico. |
| Pantalla azul con pez | BLOCKED | No reproducida con 4 ciclos × 4 solapas y recargas por ancho en local y Pages. Cero `pageerror` y solicitudes fallidas en estos recorridos. Logs de consola, respuestas/headers, DOM y localStorage guardados. No se atribuye a React ni a TinyFish. No se dispone del DOM/consola del instante histórico del bloqueo. |
| Leopold: signo → M → I | PASS | `—` → `− · por valorar` → `−7/—` → `−7/5`; resumen, diagonal, ponderación exploratoria 35; recarga, edición de ejes por ID y archivos JSON/CSV parseados. |
| Paridad de planilla Leopold | PASS | 50 interacciones de fixture didáctica en contexto aislado, 18 positivas/32 negativas; resúmenes y CSV. No son mediciones de campo. |
| F1 −34 moderado | PASS | IN=4, EX=2, MO=4, PE=4, RV=1, SI=1, AC=1, EF=4, PR=1, MC=2, recargos 0, signo negativo. Recarga real y descarga JSON/CSV. |
| F2 1000 UIP | PASS | Siete coeficientes 1, fuente/panel/fecha sintéticos; distribución entera total 1000. Tras `page.reload()`, se abre de nuevo ponderación y se comprueba total y borrador intacto. Tamiz ficticio de una interacción con umbral 40. No equiparar UIP con Leopold. |
| F3a lineal y sincronización | PASS | SIN=20, CON=50, decreciente 0..100: CA 0.8000/0.5000/−0.3000, gráfico de 1 fila, contador 1/7. Quitar fuente CON invalida editor/gráfico/contador simultáneamente (0/7); reponerla restituye 1/7. Recarga y JSON/CSV reales. No se confirmó el supuesto bug de sincronización. |
| F3b sintética válida | PASS | Origen `expertos`, fuente ficticia explícita, ámbito, responsable, evidencia, indicador/unidad vinculados, fechas/fuentes de escenarios. Nudos (0,0),(50,1),(100,0), CA 0.4/1/+0.6; F3a muestra función activa y 1/7; JSON y CSV reales; recarga conserva resultado. |
| F3b documentación incompleta | PASS | Retirar evidencia bloquea evaluación con razón visible; no se desactiva validación. La falta documental observada históricamente es compatible con un bloqueo correcto; no se asegura que haya sido la única causa de aquella sesión. |
| Catálogo y archivos históricos Conesa | PASS | Un solo Conesa, cuatro solapas; pruebas de preservación de archivos históricos y daños. No hay migración ni cambio de IDs/esquemas. |
| Unitarias | PASS | `node --test tests/react-v3/*.test.mjs`: 221/221. |
| V1/V2/V3 compilación local | PASS | `npm ci` y builds V1/V2; staging V3 equivalente en PowerShell, `npm run build` con typecheck. Hashes V1/V2 intactos al copiar V3. Windows/Node 24 local; CI Ubuntu/Node 22 es la ejecución canónica de `bash v3/scripts/build-v3.sh`. |
| Script Bash literal en este Windows | NOT_RUN local | No hay Bash/rsync en este entorno. No se presenta el staging PowerShell como ejecución literal de ese script. |
| CI completo del PR | PASS en primer commit; verificar HEAD posterior | [Run 41879153054](https://github.com/insideah64-lab/ambienta-web/actions/runs/41879153054) SUCCESS sobre c2909a3, todas las etapas, navegador e integridad incluidos. El código posterior y su informe se están validando: consultar los checks actuales del PR #85. Este documento es una instantánea previa a que termine ese CI; el cuerpo del PR registra el resultado final sin generar otra modificación de código. |
| Merge y publicación de esta rama | NOT_RUN / HOLD | No se fusiona ni se publica con P0 sin causa confirmada o CI sin terminar. Pages verificado corresponde a la base, no a esta rama. |
| Contraste del libro | PASS con discrepancias documentadas | [04_CONTRASTE_LIBRO_ORIGINAL.md](04_CONTRASTE_LIBRO_ORIGINAL.md). SI negativo sin soporte, tensión EX crítica/rango 100 y etapas Vj/IA pendientes. Fórmulas aprobadas intactas. |

## Evidencias

Los directorios `evidencias/local-before/`, `evidencias/pages-before/`, `evidencias/local-final/`, `evidencias/pages-final/` contienen cabeceras y diagnósticos seleccionados; los finales incluyen tabla completa. «Before/final» distingue ejecución inicial y consolidación del diagnóstico, **no un antes/después de un parche CSS**. El script guarda también capturas originales de página completa (incluido inspector) y, de forma separada, una vista de tabla sin recortes. Para esa captura aislada se expande temporalmente el contenedor y se oculta el inspector; no se modifica la aplicación ni su almacenamiento. No usar esa vista aislada para juzgar la separación del inspector: usar la página completa original.

Las capturas completas, zoom, DPR2, DOM, logs y descargas quedan en el paquete local de evidencias entregado con este chat. El CI sube sus propias capturas y descargas en el artefacto `ambienta-matrices-handoff-qa`, conservado 30 días. El artefacto inicial ya confirmado está en [run 41879153054, artefacto 13348776430](https://github.com/insideah64-lab/ambienta-web/actions/runs/41879153054/artifacts/13348776430). Las imágenes pequeñas versionadas en esta carpeta no caducan con ese artefacto. No se subió el PDF del libro ni sus páginas al repositorio.

Hashes locales de preservación HTML después del staging V3:

- V1 `dist/index.html`: `4805b39afce831fe8063012ddb2eeeceb03e1fff9317be7fa23cb08e7df6cffb`.
- V2 `dist/v2/index.html`: `6826927a5fb063bb1f7f85ef0425d86d1bd66b91eafcf8d550e1b06c22b1f92a`.

La diff de la rama se limita a V3, su workflow y este handoff. No hay cambios fuente V1/V2. El `git push` local falló por identidad Git sin permiso (`Shein25`); los commits publicados se crearon mediante el conector GitHub autorizado. No se debe confundir el commit local auxiliar `11387ef` con el remoto `c2909a3`.

## Retomar sin perder contexto

1. Leer este documento, el contraste original y `05_ESTADO_ENTREGA.json`; consultar HEAD/checks actuales del PR #85. No repetir funcionalidades ya verificadas.
2. Mantener HOLD para los dos P0. Para cerrar el conflicto histórico falta observar el fallo o recuperar evidencia del instante de TinyFish: screenshot original, URL/frame visible, hora, viewport/zoom, DOM y logs si existen. No inferir fallo React a partir de un pez.
3. Reproducir con `QA_BASE_URL` y `QA_OUTPUT`; `QA_DPR=2` cambia densidad. Usar siempre contexto nuevo DEMO-001. El diagnóstico no usa TinyFish ni credenciales personales de navegador.
4. Si se confirma una causa, aplicar parche mínimo y pruebas, volver a abrir capturas completas/ampliadas a ambos anchos y exigir CI completo antes de integrar. Verificar después Pages y sus assets.
5. Tratar los puntos metodológicos del informe como decisiones pendientes, sin introducir SI negativo, Vj, IA total ni cambios a EX crítica de manera implícita. Mantener contratos históricos y separación de Leopold.

No se invocó ninguna operación TinyFish ni se gastaron créditos adicionales.
