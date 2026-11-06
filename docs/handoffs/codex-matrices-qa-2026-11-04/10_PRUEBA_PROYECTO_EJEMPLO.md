# Prueba de Leopold y Conesa con el proyecto de ejemplo

Fecha: 2026-11-04. Solicitud del usuario: probar ambas matrices con los datos disponibles del proyecto ejemplo. Base comprobada: `44ce8f6995885c756c5a5298a1a412f66634b55b`, rama `fix/codex-matrices-qa-2026-11-04`, [PR #85](https://github.com/insideah64-lab/ambienta-web/pull/85).

## Conclusión

**PASS funcional** en la versión mejorada local y en [GitHub Pages](https://insideah64-lab.github.io/ambienta-web/v3/#/matrices), con Chromium limpio a **1366 y 1800 px**. No se encontró un nuevo defecto del producto en este recorrido. Se agregan una regresión y su incorporación al CI; no se modifican el producto, sus fórmulas, escalas ni esquemas.

**BLOCKED por datos insuficientes** para obtener una valoración ambiental del proyecto usando exclusivamente sus datos originales. Los resultados numéricos indicados abajo son controles de QA ya existentes en el repositorio, introducidos explícitamente durante la prueba; no son puntuaciones, mediciones ni conclusiones ambientales del expediente.

## Datos realmente disponibles

Fuente del ensayo: `createDemoState()`, en `web/domain.mjs`. Proyecto **DEMO-001 — Urbanización — expediente de ejemplo**, obra civil en Salta, fase Construcción, borrador no aprobado. Se utilizó el fixture original completo en un contexto aislado de navegador; no se leyó ni alteró el almacenamiento del navegador del usuario.

| Impacto original | Factor | Fase | Signo |
|---|---|---|---|
| IMP-SUE-004 · Alteración de calidad del suelo | Suelo | Construcción | negativo |
| IMP-AGU-002 · Alteración de escorrentías | Agua | Construcción | negativo |
| IMP-AIR-003 · Emisión de material particulado | Aire | Construcción | negativo |
| IMP-BIO-001 · Pérdida de cobertura vegetal | Biodiversidad | Preparación | negativo |

El expediente tiene seis programas, cuatro medidas, dos inspecciones pendientes y ninguna evidencia registrada. Los indicadores de las medidas son de gestión/seguimiento; no suministran automáticamente magnitudes ambientales SIN/CON ni funciones de calidad.

No contiene M/I de Leopold, criterios completos F1, juicios de ponderación UIP, mediciones SIN/CON ni funciones documentadas. Las cuatro acciones iniciales del constructor están rotuladas como **ejemplos**; no se presentan como inventario comprobado de esta urbanización.

## Recorrido comprobado

1. Abrir Impactos y comprobar los cuatro identificadores, nombres, factores, fases y signos originales.
2. Ir al constructor e incorporar los factores existentes del expediente.
3. Verificar cuatro altas nominales: el catálogo conserva los siete factores ilustrativos previos y añade Suelo, Agua, Aire y Biodiversidad. Quedan **11 factores × 4 acciones = 44 cruces**. No se fusionan automáticamente etiquetas distintas como «Suelo» y «Calidad del suelo».
4. Repetir la importación: no duplica factores ni reescribe el borrador.
5. Exportar el catálogo sin valorar: no hay puntuaciones inventadas; Conesa F1 sigue sin cruces calculados y F3 muestra **0 de 11**, sin gráfico fabricado.
6. Para el control numérico, seleccionar el factor importado Suelo y la acción ilustrativa de movimiento de suelos. El fundamento y la referencia distinguen el impacto fuente IMP-SUE-004 del cruce y los valores sintéticos de prueba.
7. Probar Leopold, F1, UIP, F3a y F3b, con recargas reales y lectura de archivos descargados.
8. Comparar el JSON completo del expediente original antes/después: permanece idéntico byte por byte. También se compara el borrador Leopold antes/después de trabajar en Conesa: permanece idéntico.

## Resultados

Todos los PASS de la tabla se verificaron en **local/1366, local/1800, Pages/1366 y Pages/1800**.

| Caso | Resultado observado | Estado |
|---|---|---|
| Registro de impactos | Cuatro impactos originales conservados | PASS |
| Importación de factores | 11 factores; segunda importación sin duplicados ni escritura | PASS |
| Solo datos originales | 44 cruces sin valorar; no se convierte ausencia de datos en impacto cero | PASS |
| F3 sin magnitudes/función | 0 de 11 factores calculables, sin gráfico inventado | PASS |
| Leopold con control previo | −7/5; recarga conserva M=7, I=5 y documentación; JSON y CSV descargados y leídos | PASS |
| Independencia F1 | Leopold no precarga criterios Conesa; el signo solo no produce puntuación | PASS |
| F1 con control previo | −34, Moderado; criterios propios, referencia explícita a QA; recarga y JSON/CSV | PASS |
| F2 UIP | 11 coeficientes iguales declarados manualmente como ensayo; total mostrado y suma de las 11 asignaciones tras recarga = 1000; JSON/CSV | PASS |
| F3a con control previo | SIN=20, CON=50; recta decreciente 0..100: 0,8000 / 0,5000 / −0,3000; contador 1 de 11; JSON/CSV | PASS |
| F3b con control previo | Nudos (0,0), (50,1), (100,0), origen sintético documentado: 0,4000 / 1,0000 / +0,6000; recarga, función activa en F3a, contador 1 de 11; JSON/CSV | PASS |
| Procedencia de escenarios de QA | Ambos escenarios declarados estimados, fuentes y ámbito sintéticos; no se presentan como mediciones del proyecto | PASS |
| Conservación del expediente | Proyecto, impactos, medidas, evidencias y revisión originales sin cambios | PASS |
| Consola y red del recorrido | Sin pageerror, solicitudes fallidas ni respuestas HTTP >=400 en las cuatro ejecuciones | PASS |
| Evaluación ambiental numérica solo con datos originales | Faltan los insumos técnicos mencionados; no se completan arbitrariamente | BLOCKED |
| Nueva publicación del PR | No hubo despliegue; se probó la Pages existente y el build mejorado por separado | NOT_RUN |

Los coeficientes iguales de UIP son únicamente un ensayo matemático. No acreditan un panel real ni una ponderación válida para la urbanización. Tampoco el indicador sintético mg/L representa una medición de suelo. Ningún resultado se presenta como Vj, impacto global, aprobación o cumplimiento normativo.

## Versiones y evidencias

La prueba local usa el producto de `44ce8f6`: JS `index-DxZE-Ike.js`, CSS `index-lytXZ14H.css`. Pages sirve la versión anterior: JS `index-BoIbwhjn.js`, CSS `index-LITKOc0i.css`. La diferencia de presentación no se confunde con una publicación de las mejoras del PR.

Script reproducible: `v3/overrides/scripts/demo-project-matrices-smoke.mjs`, copiado al preparar V3. Se añade al CI existente como el **45.º script de navegador**. El resultado definitivo del CI de este commit se registra en el PR #85.

```text
node apps/web-v3/scripts/demo-project-matrices-smoke.mjs
```

Para Pages, configurar `QA_BASE_URL=https://insideah64-lab.github.io/ambienta-web/v3/` y una carpeta `QA_OUTPUT` separada. Por defecto no realiza escrituras en GitHub ni en el servidor: trabaja solo en el almacenamiento de su contexto de navegador aislado.

Evidencias: `qa/ambienta-demo-project-matrices/local/` y `published/`. Cada carpeta contiene resultados, fuente del proyecto, capturas completas y primeros planos, y JSON/CSV descargados por ancho. En CI se ejecuta local y se adjunta dentro de `ambienta-matrices-handoff-qa`; Pages fue probado por separado en esta sesión. Se abrieron y revisaron capturas del factor Suelo y Conesa, incluidos el resultado −34 y el gráfico activo +0,6000 con contador 1/11.

Esta prueba no reproduce los dos incidentes históricos P0 ni modifica su estado BLOCKED, documentado en [03_CONTINUIDAD_QA_Y_HOLD.md](03_CONTINUIDAD_QA_Y_HOLD.md). No se invocó TinyFish ni vidIQ.
