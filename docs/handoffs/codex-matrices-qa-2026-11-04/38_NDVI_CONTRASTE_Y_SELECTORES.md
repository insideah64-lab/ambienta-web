# NDVI: contraste y menús legibles — 2026-11-05

Rama feature/mita-ndvi-contraste-2026-11-05, apilada sobre PR #95 / commit 9568058cf222b5e2bc05611026dff8103a1f2e0b. No requiere cambios adicionales en el motor privado. Mantener HOLD: sin merge ni despliegue.

## Problema y corrección

La captura del usuario muestra texto claro sobre opciones nativas blancas del selector de ampliación en Windows. El visor no definía colores de las opciones. Se establecen color-scheme dark, fondo #173c48 y texto #f2fafb para los selectores y sus opciones, limitados a este visor. Se capturó el menú realmente abierto a 1366 y 1800 y se revisaron visualmente sus opciones.

Se agrega selector «Contraste de color»: Normal / Alto · solo visual. Alto aplica CSS contrast(1.45) saturate(1.2) exclusivamente al elemento de imagen NDVI y su leyenda, con exactamente el mismo filtro; no al damero, textos ni histograma. Puede saturar tonos; el aviso es visible. Normal permanece como valor inicial. Los dominios fijo -1..1 y local P02..P98 no cambian. No es una clasificación científica ni normativa. RGB y fallback histórico deshabilitan el control y no reciben el filtro. No hay nuevo procesamiento de bandas ni recoloración de archivos descargables.

El parámetro URL contraste=alto persiste al recargar; cambiar de trabajo lo limpia. Los valores consultados se siguen leyendo del TIFF original.

## Resultados

| Prueba | Estado | Evidencia |
|---|---|---|
| Build TypeScript/Vite | PASS | compilación local |
| Unitarias públicas | PASS | 273 pruebas existentes |
| Playwright DEMO-001 y DIAB-2026-DEMO | PASS | 1366/1800, colores de opciones con contraste >=4.5, filtro imagen=leyenda, URL/recarga, mismo src, RGB sin filtro, descargas y fallback |
| Escena real histórica Diablillos | PASS | trabajo 1b93d1e5806220a8427e7431c569a0bd; mismo TIFF, informe y preview byte a byte, mismo histograma, fila 575/columna 683 NDVI 0,0611 |
| Capturas completas y paneles | PASS | normal/alto, menú nativo abierto a 1366/1800; ocho imágenes abiertas y revisadas |
| CI remoto de esta iteración | NOT_RUN | al escribir; cierre en PR y resultado final local |
| Motor privado | NOT_RUN | no hay cambios en motor; CI previo de PR #10 aprobado |
| Merge / despliegue / Pages nuevo | NOT_RUN | HOLD |

Evidencias locales: work/ndvi-contrast-live-qa/{normal,alto}-{1366,1800}-panel.png; alto-{1366,1800}-full.png; menu-{1366,1800}.png; results.json. Prueba real reproducible work/test-ndvi-contrast-live.mjs; regresión CI en v3/overrides/scripts/ndvi-workbench-smoke.mjs. El artefacto habitual del CI conserva las capturas de fixtures.

Para probar, abrir el servicio asistido local 8790 y sumar &vista=local&paleta=cividis&contraste=alto al trabajo histórico. Abrir Ampliación para comprobar el menú, alternar Normal/Alto y consultar un píxel. No comparar fechas usando contraste local ni interpretar la saturación visual como aumento del valor NDVI.

Pendientes heredados: visor georreferenciado sobre mapa y series temporales. Integración apilada y publicación siguen pendientes de revisión.
