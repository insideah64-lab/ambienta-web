# NDVI: zoom visible y selección de paletas — 2026-11-05

## Continuidad y alcance

Rama `feature/mita-ndvi-zoom-paletas-2026-11-05`. UI basada en PR #94, commit `a96bac98289affdef057cd87453dcf6f7cbca44b`, y motor privado basado en PR #9, commit `fbe325ab18ed48d6758398e2e9e9a5401aeb01a2`, verificados antes de publicar esta rama. Mantener HOLD: sin merge ni despliegue. Los números de nuevos commits/PR y el cierre del CI se registran en los PR y el resultado final local. Integración apilada: conservar las bases anteriores hasta su revisión.

## Comportamiento

- Botones visibles + / − / Ajustar, niveles 1, 2, 4 y 8 relativos al tamaño ajustado; rueda dentro del visor conserva el punto bajo el cursor. Ctrl+rueda queda para el navegador. Arrastre para mover; el arrastre no consulta píxeles. Un clic consulta el TIFF original.
- Selector Original / Viridis / Cividis. Viridis es la opción visual inicial si el servicio ofrece paletas; servicios anteriores conservan la vista histórica. En RGB se deshabilita el selector.
- Escala fija conserva −1..+1; Detalle local conserva P02..P98 explícitos. Este contraste no permite comparar colores entre fechas y no representa categorías normativas ni contaminación.
- Paletas interpoladas en RGB con cinco anclas documentadas en `visual_review.py`; aproximaciones de Viridis/Cividis, no una dependencia ni una reproducción de las tablas completas de Matplotlib. Referencia: https://matplotlib.org/stable/users/explain/colors/colormaps.html
- Modo, paleta y ampliación sobreviven a recarga por URL. Cambiar trabajo limpia esas preferencias. Ampliar no agrega resolución espacial.
- Derivados nuevos `view-{fixed|local}-{viridis|cividis}.png`; nunca se reescriben TIFF, informe ni preview históricos. NDVI, calibración, SCL, geometría, estadísticas, esquemas y almacenamiento conservados.

## Evidencia y resultados

| Comprobación | Estado | Evidencia |
|---|---|---|
| Unitarias públicas | PASS | 273 tests |
| Motor privado | PASS | 73 tests Python, incluye ambas paletas y modos, misma máscara, dominios y fuente intacta |
| Build TypeScript/Vite | PASS | compilación local |
| Playwright demos DEMO-001 y DIAB-2026-DEMO | PASS | 1366/1800, botones, selector, recarga, descargas, fallback histórico y recuperación RGB |
| Escena real histórica | PASS | trabajo 1b93d1e5806220a8427e7431c569a0bd; S2B_T19JGN_20250608T143735_L2A; 1276×1324 EPSG32719 |
| Zoom real y arrastre | PASS | tamaño 2× relativo al ajustado, rueda 4×, arrastre cambia posición sin consultar, clic posterior identifica fila/columna esperada |
| Persistencia y descargas | PASS | paleta/modo/zoom en URL; GeoTIFF e informe descargados y comparados byte a byte; preview y almacenamiento intactos |
| Máscara de derivados | PASS | alfa 255/0 de fijo/local/RGB igual a máscara TIFF: 1.137.598 píxeles válidos |
| Capturas abiertas y revisadas | PASS | completas fijas y paneles fijos/local/RGB a 1366/1800; panel ampliado 4× |
| CI remoto de esta rama | NOT_RUN | al crear este documento; cierre definitivo en PR |
| Merge, despliegue y Pages nuevo | NOT_RUN | HOLD; no se solicitó publicar esta iteración |

Estadísticas conservadas: mínimo −0,219774, promedio 0,074416 y máximo 0,319310. P02 0,028541 y P98 0,112299. Con escala completa es correcto que el área tenga tonos cercanos; cambiar colores no debe inventar variación.

Evidencias locales: `work/ndvi-zoom-live-qa/` contiene PNG completos/paneles, `zoom-4-pan-panel.png`, descargas originales y `results.json`; `alpha-verification.json` verifica máscara independiente con rasterio/Pillow. Prueba reproducible local `work/test-ndvi-zoom-live.mjs`; fixtures reproducibles en `v3/overrides/scripts/ndvi-workbench-smoke.mjs`.

## Cómo retomar

1. Revisar los PR apilados públicos y privados y sus checks, sin saltar las bases.
2. Abrir la versión asistida local puerto 8790, caso diablillos, trabajo indicado. Elegir Detalle local, probar ambas paletas y zoom/arrastre. Escala fija sigue disponible para un dominio estable.
3. Revisar ZIP local de esta iteración, con manifiesto SHA y capturas. El CI conserva el artefacto habitual de QA del proyecto.
4. Pendientes fuera de alcance: visor georreferenciado sobre mapa, series temporales y despliegue remoto autenticado. No confundir este visor de píxeles con un mapa con coordenadas de navegación.
