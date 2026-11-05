# NDVI: Tierra y verdes, escala fija — 2026-11-05

## Continuidad

Rama feature/mita-ndvi-tierra-verdes-2026-11-05. Base pública PR #96, commit 8433b0b9a21d5686c4a127d1e70b9be1f173f545; base privada PR #10, commit bf29f2666cc7bc41645f9bf941142476ba457208. HEAD verificados. Nuevos commits y cierre CI registrados en los PR y resultado final local. HOLD: sin merge ni despliegue.

## Decisión visual y fundamento

El usuario pidió verdes vivos cuando el NDVI sea compatible con vegetación, sin teñir el área árida por un estiramiento local. Se agrega Tierra y verdes: dominio absoluto −1..+1, tonos tierra cerca de cero y transición a verdes más vivos en valores mayores. No se asignan clases de cobertura, estados de salud, contaminación ni índices normativos.

Referencia de contexto: USGS describe valores generalmente bajos sobre roca/suelo y valores mayores asociados a vegetación; no proporciona una paleta normativa ni confirma cobertura por píxel: https://www.usgs.gov/special-topics/remote-sensing-phenology/science/ndvi-foundation-remote-sensing-phenology . Las anclas RGB son una decisión visual documentada, no umbrales aprobados de clasificación.

Anclas NDVI/RGB: −1=(25,68,96); −0,1=(94,133,151); 0=(174,139,98); 0,1=(195,164,116); 0,2=(205,192,139); 0,3=(176,190,112); 0,45=(116,203,66); 0,6=(44,192,58); 0,8=(8,145,55); 1=(4,88,40). Interpolación RGB continua; alfa válido 255 y sin dato 0.

La paleta usa exclusivamente escala fija, sin filtro de contraste. Al elegirla se limpian vista local y contraste alto en URL; incluso una URL anterior que los conserve muestra fijo y normal. Se deshabilitan esos dos controles solo para esta paleta, con explicación visible. Las otras paletas y el contraste local continúan disponibles para exploración. RGB de la misma fecha permanece disponible.

Tierra y verdes es la opción inicial en servicios compatibles si no hay paleta explícita. Se agrega análisis opcional `terrain` fuera del mapa `palettes` anterior para que clientes anteriores ignoren el campo sin rechazar Viridis/Cividis. No se cambian esquemas persistidos, informes, TIFF, fórmulas, calibración, SCL ni estadísticas. Derivado nuevo: view-fixed-terreno; no se expone equivalente local. Casos vacíos conservan máscara transparente y no inventan percentiles.

## Resultados

| Comprobación | Estado | Evidencia |
|---|---|---|
| TypeScript/Vite | PASS | build local |
| Unitarias públicas | PASS | 274 tests, incluido rechazo de dominio local en terrain |
| Motor privado | PASS | 75 tests; valores bajos tierra, altos verdes, máscara exacta; mismo valor/mismo color entre distribuciones, rechazo local, vacíos/constantes e integridad |
| Playwright ambas demos | PASS | 1366/1800, selección inicial, cambio desde local/alto, deshabilitación, recarga, controles anteriores y descargas |
| Escena histórica real | PASS | trabajo 1b93d1e5806220a8427e7431c569a0bd; fijo normal aun con URL local/alto; TIFF/informe/preview idénticos byte a byte, mismo histograma y píxel 575/683=0,0611 |
| Capturas abiertas | PASS | completas y paneles a 1366/1800, tira de valores sintéticos conocida |
| CI remoto nuevo | NOT_RUN | al escribir; cierre en PR |
| Merge/despliegue/Pages nuevo | NOT_RUN | HOLD |

La escena real conserva media 0,074416 y máximo 0,319310. No se fuerza vegetación densa mediante verdes intensos donde el raster no tiene valores altos. Consultar píxeles y comparar con RGB para interpretar.

## Evidencia y cómo retomar

`work/ndvi-terrain-live-qa/`: terreno-{1366,1800}-{full,panel}.png, colores-sinteticos.png (datos inventados rotulados, no observaciones del proyecto), synthetic-colors.json, results.json. Prueba reproducible local: work/test-ndvi-terrain-live.mjs. Fixtures CI: v3/overrides/scripts/ndvi-workbench-smoke.mjs. ZIP local AMBIENTA_NDVI_Tierra_Verdes_QA.zip con manifiesto SHA; artefacto habitual de CI conserva capturas de fixtures.

Abrir servicio local 8790, caso diablillos, trabajo indicado, &paleta=terreno&vista=fixed&contraste=normal. Recargar con Ctrl+F5. Revisar PR apilados sin omitir bases. Pendientes heredados: visor georreferenciado, series temporales e integración/publicación posterior.
