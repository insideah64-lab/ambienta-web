# PROMPT PARA CODEX — AMBIENTA · Cierre de QA real de Leopold y Conesa

Trabajá sobre el repositorio GitHub **`insideah64-lab/ambienta-web`**, desde `main`. El handoff completo está versionado en `docs/handoffs/codex-matrices-qa-2026-11-04/`; LEÉ primero `00_LEER_PRIMERO.md` y `02_EVIDENCIAS_Y_CRITERIOS.md`. No dependas del texto de un chat previo, no rehagas funciones ya terminadas y verificá HEAD antes de editar.

## Contexto confirmado
En la fecha de traspaso, `main` estaba en `98a4f3b7cfd196f287eba2a161516bdac1e663c3`, PR #82 fusionado y Pages `41869294822` SUCCESS. Web: https://insideah64-lab.github.io/ambienta-web/v3/#/matrices. Hay **una sola Matriz de Leopold** (identificación + valoración M/I) y **un solo Conesa** con cuatro solapas F1/F2/F3a/F3b. La ponderación exploratoria de Leopold es opcional y NO normativa. No dupliques módulos ni migres datos.

## Encargo ejecutable, en orden de prioridad

**P0 — Reproducir y arreglar de verdad la cabecera de Leopold.** El usuario observó «Componente ambiental» pegado arriba. PR #82 intentó solucionarlo y Playwright lo declaró PASS, pero el tercer TinyFish sobre Pages publicado seguía reportando FAIL. Reproducí con Chromium limpio tanto en build local como en Pages, anchos 1366/1800 y si procede distintos zoom/DPR. Guardá fotos de la **tabla completa y primer plano real de la cabecera** antes y después, inspeccioná visualmente cada foto; medí centro de píxeles/texto (no solo caja), computed CSS, cascada de `thead th span`, alineación de celdas y superposición con inspector. Confirmá si el sitio carga exactamente el commit nuevo (caché/asset/gh-pages). Solo implementá el parche mínimo si hay fallo reproducible. Si no podés reproducirlo, dejá evidence y estado BLOCKED, no «corregido» por un test aislado.

**P0 — Diagnosticar pantalla azul con pez/carga persistente.** La tercera sesión TinyFish quedó bloqueada hacia el paso 95 de 102, tras navegar entre matrices. No asumir error React ni que sea culpa de TinyFish. Reproducir con secuencia corta determinista; guardar screenshots, DOM, consola, `pageerror`, red fallida, tiempos, estado localStorage, errores al refrescar. Distinguir splash de la aplicación, animación del navegador/agente, bucle de render, memoria y assets/caché. Corregir solo cuando haya causa confirmada y añadir test E2E.

**P1 — Verificar Conesa F3a con 1 factor validado y gráfico.** Con datos SINTÉTICOS: indicador «Concentración ficticia QA», unidad de prueba, dominio 0..100, función lineal decreciente, SIN=20 y CON=50 con fechas, composición y fuentes válidas. Comprobar CA SIN=0,8000; CA CON=0,5000; ΔCA=−0,3000; indicador resumen **1 de 7 factores calculables** y una fila/gráfico comparativo. En TinyFish hubo valores del editor, pero un reporte de «0 de 7»; determinar si faltaban datos, era estado inicial o hay bug de sincronización entre `ConesaF3Panel.tsx` y `ConesaF3Comparison.tsx`. No forzar el contador: debe derivarse de registros calculables reales.

**P1 — Validar Conesa F3b sin anular sus controles.** Probar nudos `(0,0),(50,1),(100,0)` para SIN=20 y CON=50, con metadatos completos y origen sintético `expertos`/`estudio` (NO fingir página del Anejo 4). Esperado tras validación: CA SIN=0,4, CA CON=1, ΔCA=+0,6, curva evaluable, y F3a refleja la función activa. Probar también caso documental incompleto: debe permanecer bloqueado con razones visibles. Si la UI no permite completar una validación exigida por el modelo, corregir la UI, no eludir la regla.

**P1 — Persistencia y exportación reales.** Comprobar recarga `page.reload()`, no botón de tema; F1 importancia `−34` moderada (parámetros demo), F2 1.000 UIP y tamiz (sin asumir persistencia histórica), F3a y nudos F3b; Leopold `−7/5` y diagonal opcional. Verificar descarga de JSON real de Leopold/F3a/F3b mediante Playwright `acceptDownloads` y parse del fichero, además de CSV si aplica. Nunca declarar PASS solo porque aparece el botón.

**P2 — Experiencia visual y claridad.** Verificar que las cuatro solapas de Conesa sean distinguibles y que ninguna entrada/documentación se pierda al alternar. Mantener una única tabla Leopold y analítica exploratoria aparte. Si es necesario, mejorar el error de validación F3b y el estado vacío de F3a sin adornos engañosos.

## Restricciones
No usar datos reales de proyectos; crear escenarios solo en navegador de laboratorio DEMO-001/almacenamiento aislado. No borrar, renombrar ni migrar automáticamente el esquema `ambienta.impact-matrix.v1`, IDs y claves `ambienta-conesa-libro-1997-*`. No alterar fórmulas homologadas ni equiparar Leopold M/I con Conesa importancia. No sumar impactos de signos distintos como «saldo ambiental» ni emitir conclusiones normativas.

## Cómo ejecutar y aceptar
- Revisar el workflow `.github/workflows/v3-preview.yml` y reproducir `npm ci`, build V1/V2, `bash v3/scripts/build-v3.sh`, `node --test tests/react-v3/*.test.mjs` y hashes de preservación.
- Playwright con la web servida desde `dist` como el workflow, ejecutando en particular `apps/web-v3/scripts/impact-matrix-builder-smoke.mjs`, `leopold-workbook-parity-smoke.mjs`, `conesa-libro-f2-smoke.mjs`, `conesa-libro-f3a-smoke.mjs`, `conesa-libro-f3b-smoke.mjs` y el catálogo. Agregar tests de regresión específicos. Guardar screenshots antes/después a 1366/1800 y VERLOS antes de entregar.
- Abrir rama `fix/codex-matrices-qa-...`, documentar diagnóstico y pruebas, abrir PR. No fusionar con CI rojo ni afirmar publicación sin GitHub Pages SUCCESS. Si está todo PASS, fusionar y comprobar la web real; si queda HOLD, dejar PR sin merge y detallar motivo.
- Entregar resultado con tabla por caso **PASS/FAIL/BLOCKED/NOT_RUN**, enlaces a commit/PR/CI, capturas y rutas, fallos reproducibles y decisiones pendientes. Actualizar el handoff con cualquier hallazgo no resuelto. Priorizar precisión sobre cantidad de cambios; **no gastar TinyFish** salvo necesidad fundamentada y aprobación del usuario.

## Evidencia para contrastar
TinyFish 1 https://agent.tinyfish.ai/runs/55cd5c09-55f7-410d-b24c-a62309a5c4ba  
TinyFish 2 https://agent.tinyfish.ai/runs/ea5eb73e-1aaf-452a-861f-775c3457b360  
TinyFish 3 https://agent.tinyfish.ai/runs/efe91e9f-546e-4f0b-8eb8-b2836db43a82  
PR #82 https://github.com/insideah64-lab/ambienta-web/pull/82  
Pages https://github.com/insideah64-lab/ambienta-web/actions/runs/41869294822

Comenzá recuperando el código y reproduciendo **P0**, no escribiendo una propuesta abstracta. Continuá con P1 y pruebas hasta dejar evidencia verificable.
