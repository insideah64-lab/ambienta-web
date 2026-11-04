# Continuidad: constructor de matrices para PC

Fecha: 2026-11-04. Solicitud: mejorar el constructor revisado, con alcance de aceptación exclusivamente para PC, según aclaración del usuario. Rama `fix/codex-matrices-qa-2026-11-04`; [PR #85](https://github.com/insideah64-lab/ambienta-web/pull/85).

## Commits y estado

- Main comprobado antes de la mejora: `841f1356f86a3561be70fb0d3c7ce961a8d3640b`.
- Base de esta mejora: `71af2916d98274d06d870aff2677d17b7eb57f9b`.
- Implementación y regresiones: `ba1f8a9cada4be96d9ace1b2d8c46885e3bbf230`.
- CI de la primera implementación: [run 41890657557](https://github.com/insideah64-lab/ambienta-web/actions/runs/41890657557). **PASS: workflow completo satisfactorio**, incluidas compilaciones, 223 pruebas unitarias, 44 scripts de navegador, conservación de V1/V2 y subida de artefactos. El HEAD documental anterior también pasó el CI completo: [run 41891922212](https://github.com/insideah64-lab/ambienta-web/actions/runs/41891922212).
- No se fusiona ni se despliega: continúan abiertos los P0 históricos no reproducidos de [03_CONTINUIDAD_QA_Y_HOLD.md](03_CONTINUIDAD_QA_Y_HOLD.md). Este cambio de usabilidad no se presenta como solución demostrada de aquellos incidentes.

Revisión posterior sobre el HEAD `274dcdd29196072ec3ac35388ddae5580fe74328`: los contadores ahora se limitan al catálogo actual; las celdas históricas ajenas a este catálogo permanecen intactas y exportables. Se agregaron una prueba unitaria y una regresión de navegador que carga y vuelve a descargar ese caso. El resultado definitivo del CI de esta revisión queda enlazado en el PR #85.

## Comportamiento entregado

1. Selector de métodos compacto por defecto, con las descripciones completas disponibles a demanda. Seleccionar un método vuelve a plegar la presentación. Los borradores siguen separados por método.
2. Introducción y ayuda plegables. Permanecen visibles el carácter de borrador local, la advertencia DEMO y la ausencia de aprobación ambiental automática.
3. Modo de espacio ampliado: oculta la navegación lateral y la introducción, conservando el árbol React y la evaluación en curso. El botón permite restaurar la navegación.
4. Acceso directo «Ir a evaluación», que desplaza y lleva el foco a la zona activa sin crear ni modificar una evaluación.
5. Editor Leopold plegable; una celda, una flecha o un recorrido pendiente lo abre. Cerrarlo conserva la selección y los datos.
6. Flechas para recorrer celdas, Inicio/Fin para extremos de la fila. Botones separados para avanzar a la siguiente valoración pendiente o a una valoración por documentar; el recorrido respeta los factores visibles y omite las declaraciones de ausencia de interacción.
7. Diferenciación entre magnitud/importancia completas y presencia de fundamento/referencia. Registrar ambos textos no equivale a verificar técnicamente la evidencia. Una declaración «sin interacción» no solicita puntuaciones.
8. Indicadores debajo de la tabla para priorizar el trabajo. Se mantienen los resúmenes y las herramientas exploratorias existentes.

No hay cambios de fórmulas, escalas, categorías, identificadores, esquemas, claves de almacenamiento, V1 o V2. No se migraron ni eliminaron datos. El nuevo `LeopoldWorkflow.ts` solo deriva estados de presentación y candidatos de navegación.

## Verificación y resultados

| Comprobación | Resultado |
|---|---|
| TypeScript y build V3 | PASS |
| Pruebas unitarias completas | PASS: 224/224 locales; incluye tres pruebas nuevas sobre independencia de documentación, ausencia de interacción, filtros y recorrido circular; conservación de celdas históricas fuera del catálogo |
| Nuevo recorrido Playwright PC | PASS a 1366 y 1800: presentación sin escritura local; modo ampliado/restauración; salto con foco; estados documentales; teclado; ausencia de interacción; recarga; JSON descargado y leído |
| Regresión existente de constructor | PASS a 1366/1800: edición, altas, persistencia y descargas CSV/JSON |
| Catálogo y archivos históricos Conesa | PASS a 1366/1800, sin convertir archivos anteriores |
| Conesa F1/F2/F3a/F3b | PASS a 1366/1800 en sus regresiones existentes; 1000 UIP y ΔCA −0,3 / +0,6 conservados |
| Paridad de planilla Leopold | PASS a 1366/1800: 50 interacciones; 18 positivas, 32 negativas; agregados auxiliares preservados |
| Geometría del encabezado | PASS local: texto centrado, desplazamiento, zoom 125% y cambios de método/etapa; sin errores JS ni solicitudes fallidas en el diagnóstico P0 |
| Revisión visual | PASS: capturas completas y ampliadas abiertas y revisadas, a 1366 y 1800; también espacio ampliado, tabla y editor |
| Causa del encabezado histórico y pantalla azul con pez | BLOCKED: no reproducida; sin atribuir causa nueva |
| Publicación de esta mejora y verificación posterior en Pages | NOT_RUN: no hay despliegue mientras el PR siga en HOLD |

Mediciones de Chromium/Windows, DEMO-001 limpio:

| Ancho | Inicio de tabla desde el documento | Ancho disponible sin editor | Ancho en modo ampliado |
|---|---:|---:|---:|
| 1366 | 1012,17 px | 1018,59 px | 1288,59 px |
| 1800 | 1012,17 px | 1442,63 px | 1712,63 px |

La captura/medición publicada anterior a 1366 registraba inicio de tabla en 2115,44 px: la presentación previa a la tabla se redujo aproximadamente un 52%. La tabla conserva desplazamiento propio; la página no desborda horizontalmente en las pruebas PC.

La nueva prueba de aceptación solo incluye PC. Se realizó una comprobación móvil exploratoria antes de la aclaración del usuario; no forma parte de la aceptación ni de la nueva batería del CI.

## Evidencias y reproducción

`matrix-workspace-smoke.mjs` se incorpora al CI existente. Sus evidencias se guardan en `qa/ambienta-matrix-workspace/`, dentro del artefacto `ambienta-matrices-handoff-qa`. Incluyen:

- `initial-1366.png`, `initial-1800.png`: página completa.
- `expanded-1366.png`, `expanded-1800.png`: espacio ampliado.
- `header-1366.png`, `header-1800.png`: encabezados ampliados.
- `workbench-1366.png`, `workbench-1800.png`: acceso directo a la evaluación.
- `documented-1366.png`, `documented-1800.png`, `editor-1366.png`, `editor-1800.png`: valoración y editor.
- `matrix-1366.json`, `matrix-1800.json`: descargas verificadas, sin cambiar el esquema; conserva también las celdas históricas fuera del catálogo.
- `results.json`: medidas y resultados por ancho.

Comandos desde la raíz del repositorio, tras preparar V3 con el procedimiento existente:

```text
npm --prefix apps/web-v3 run build
node --test tests/react-v3/*.test.mjs
node apps/web-v3/scripts/matrix-workspace-smoke.mjs
node apps/web-v3/scripts/matrices-p0-diagnostic.mjs
```

Las pruebas de navegador usan el servidor local de `dist` en 127.0.0.1:8787 o `QA_BASE_URL`. No se usó TinyFish ni vidIQ. La investigación gratuita de videos y documentos sigue en [07_REVISION_YOUTUBE_Y_MATERIALES.md](07_REVISION_YOUTUBE_Y_MATERIALES.md); sus límites y pendientes metodológicos permanecen vigentes.
