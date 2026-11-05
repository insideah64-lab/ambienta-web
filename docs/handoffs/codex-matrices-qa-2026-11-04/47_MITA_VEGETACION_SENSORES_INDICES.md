# MITA: sensores, índices de vegetación y comparación real

Fecha de ejecución: 2026-11-05. Rama `feature/mita-vegetacion-sensores-2026-11-05`.

## Estado para continuar

HOLD: sin merge ni despliegue. `main` público verificado en `841f1356f86a3561be70fb0d3c7ce961a8d3640b`. Se continúa sobre los PR #98 público y #12 privado, sin reescribirlos.

Commits de implementación:

- Interfaz: `0575b4beb3328f195e19b0ded15cda835c9966eb`, padre `42db4b90eb4c5ce6c3a502966c2786a10016fd38`.
- Motor privado: `eef97c559c407c47cbffc62886be9cc0a1d06675`, padre `5dc9a641b930917b4667a268fae8b5629b9f4459`.
- El commit documental posterior incorpora este informe, resultados y capturas. Su SHA y los checks definitivos se consultan en los PR de esta rama. No inferir aprobación del CI a partir de las pruebas locales.

Se agregaron dos elecciones distintas: **sensor** e **índice**. Sentinel-2 L2A y Landsat 8/9 C2 L2 Tier 1 calculan NDVI, SAVI, MSAVI2 y EVI. MODIS tiene una guía explícita, con el cálculo deshabilitado: no se presenta como un adaptador terminado.

La pestaña «Sensores e índices» es independiente del flujo histórico NDVI MITA 0.2 y del NO₂ L2. Los esquemas nuevos son `mita.vegetation/1` y `mita.vegetation-comparison/1`. No se migraron bases, localStorage ni registros históricos. No hay cambios en matrices, V1/V2, fórmulas Conesa/Leopold ni Área de estudio.

## PDF aportado: qué se puede trasladar

Se leyó el PDF de cuatro páginas de Jeevalakshmi, Reddy y Manikiam, *Land Cover Classification based on NDVI using LANDSAT8 Time Series: A Case Study Tirupati Region* (ICCSP, 2016, pp. 1332–1335). Se renderizaron y abrieron las páginas metodológica y de resultados.

El caso estudia Tirupati, India, en tres estaciones de 2015. Describe imágenes Landsat 8 de nivel 1, conversión a radiancia, combinación de bandas, NDVI y clasificación supervisada con muestras. Sus tablas presentan solapamiento entre suelo, áreas construidas y vegetación. No justifican clases universales de cobertura para Argentina. La referencia a UTM 44 corresponde a ese estudio, no a cualquier polígono.

AMBIENTA utiliza reflectancia de superficie C2 L2 calibrada y sus máscaras QA; no copia la cadena radiométrica de nivel 1 ni los umbrales del caso indio. Es una diferencia identificada y justificada por el producto elegido, sin cambiar la fórmula NDVI ya existente. La clasificación supervisada, sus muestras y su validación independiente **no se implementaron** en esta entrega.

El archivo original queda en la ubicación aportada por el usuario. No se redistribuye el PDF en el repositorio público.

## Contraste con fuentes técnicas y enlaces aportados

Los artículos de [MappingGIS](https://mappinggis.com/2020/07/los-6-indices-de-vegetacion-para-completar-el-ndvi/) y [EOS](https://eos.com/es/blog/indice-de-vegetacion-de-diferencia-normalizada-o-ndvi/) sirven como introducción y referencia de presentación. Las fórmulas y máscaras de esta implementación se contrastaron con documentación primaria, no se aprobaron por el aspecto de sus mapas.

| Índice | Perfil implementado | Uso que merece evaluar |
|---|---|---|
| NDVI | `(NIR − R) / (NIR + R)`; se conserva la función existente | Referencia general; influido por suelo y saturación |
| SAVI | `1,5 × (NIR − R) / (NIR + R + 0,5)` | Cobertura escasa e influencia del suelo; L=0,5 explícito |
| MSAVI2 | `(2 NIR + 1 − √((2 NIR + 1)² − 8(NIR − R))) / 2` | Otra evaluación del fondo del suelo sin L fijo |
| EVI | `2,5 × (NIR − R) / (NIR + 6R − 7,5B + 1)` | Doseles densos; requiere calidad de la banda azul |

Referencias de fórmulas: [USGS SAVI](https://www.usgs.gov/landsat-missions/landsat-soil-adjusted-vegetation-index), [USGS MSAVI](https://www.usgs.gov/landsat-missions/landsat-modified-soil-adjusted-vegetation-index), [USGS EVI](https://www.usgs.gov/landsat-missions/landsat-enhanced-vegetation-index). El nombre MSAVI2 explicita la forma cerrada implementada; no se mezcló con otras variantes iterativas.

Las constantes de SAVI y EVI requieren reflectancia, no DN. Landsat aplica `DN × 0,0000275 − 0,2` antes de calcular, según [USGS Collection 2 SR](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-reflectance). Se verifica además la escala y offset declarados en STAC. Sentinel-2 usa los metadatos de cada activo, conservando su calibración específica.

En Landsat se excluyen los bits 0–5 de QA_PIXEL (relleno, nube dilatada, cirro, nube, sombra y nieve) y cualquier QA_RADSAT no nulo, incluida oclusión del terreno. No se elimina agua por su bit específico. Esta es una selección conservadora y explícita, no una corrección atmosférica adicional. Fuentes: [USGS calidad SR](https://www.usgs.gov/landsat-missions/landsat-8-9-surface-reflectance-quality-assessment) y [catálogo oficial GEE, tablas QA](https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2). El perfil no filtra adicionalmente SR_QA_AEROSOL: debe evaluarse para aplicaciones sensibles a aerosoles. Sentinel-2 mantiene SCL 4/5/6. Ninguna de estas reglas demuestra ausencia de toda contaminación atmosférica residual.

El artículo [Martinez y Labib, 2023](https://doi.org/10.1016/j.envres.2022.115155), enlazado por el usuario, estudia la interpretación del NDVI para exposición a verdor urbano. Se verificaron metadatos y contenido accesible del resumen en [Utrecht University](https://research-portal.uu.nl/en/publications/demystifying-normalized-difference-vegetation-index-ndvi-for-gree/). La lectura íntegra quedó BLOCKED: ScienceDirect devolvió 403; la copia institucional falló por tamaño/SSL en las vías probadas. No se atribuye al artículo una validación de este caso ni de estos umbrales.

### MODIS y otras alternativas

[MOD13Q1 v6.1](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD13Q1) ofrece NDVI/EVI a resolución nominal 250 m y composición de 16 días, con factor 0,0001 y QA propio. No es NDVI de otro tipo: cambia el sensor y también la construcción temporal del producto. Para usarlo correctamente faltan lectura de DetailedQA/SummaryQA, máscara, escala, fecha de observación por píxel y comparación de ventanas temporales. Un compuesto no equivale a una adquisición de un día. Es útil para series regionales, pero el píxel mezcla más coberturas en perímetros pequeños. **NOT_RUN**: no se calculó ni comparó un resultado MODIS real en esta sesión; no hay consulta GEE autenticada.

Para combinar sistemáticamente Landsat y Sentinel-2 conviene evaluar [HLS y HLS-VI de NASA](https://science.nasa.gov/mission/landsat/hls-vegetation-indices/), que armonizan productos a 30 m y emplean B8A en S30. Esta prueba usa B08 para conservar el perfil Sentinel-2 existente y reconoce su diferencia espectral con Landsat B5. No se rotulan estos resultados como HLS. NDMI/NDWI, NBR/NBR2 y otros índices responden a humedad, agua o incendios; requieren perfiles distintos y no son medidores directos de contaminantes criterio.

### Revisión gratuita de YouTube

- [NASA ARSET: Deriving NDVI from Landsat, parte 2](https://www.youtube.com/watch?v=elPbB8k2Sxg): descripción y capítulos accesibles; curso sobre adquisición y cálculo en QGIS. La transcripción no se obtuvo y el intento de buscar fotogramas decodificados terminó en timeout. **BLOCKED** para revisión audiovisual completa; no se afirma haber visto el curso entero.
- [NASA ARSET: MODIS NDVI Time Series, parte 3](https://www.youtube.com/watch?v=r48ajiqguvE): descripción, capítulos y transcripción visible parcial consultados. Los segmentos sobre resoluciones/productos y composición temporal respaldan separar sensores y series. La transcripción automática tiene errores y no reemplaza el catálogo técnico. **PASS acotado** a ese contenido, sin afirmar reproducción íntegra.
- Sin créditos vidIQ/TinyFish, servicios pagos ni trabajos GEE.

## Comparación real sobre el mismo polígono

Delimitación ilustrativa de Diablillos, **no oficial**: el mismo Polygon de 16 coordenadas del trabajo NDVI histórico `1b93d1e5806220a8427e7431c569a0bd`, sin redibujar, simplificar ni reemplazar por su BBOX. El código acepta cualquier Polygon/MultiPolygon WGS84 válido con hasta 2.000 coordenadas, dentro del presupuesto de píxeles.

| Magnitud nativa | Sentinel-2 | Landsat 8 |
|---|---:|---:|
| Escena | S2B_T19JGN_20250608T143735_L2A | LC08_L2SP_232077_20250609_02_T1 |
| Adquisición UTC | 2025-06-08 14:39:43 | 2025-06-09 14:24:38 |
| Resolución | 10 m | 30 m |
| CRS declarado | EPSG:32719 | EPSG:32619 |
| Píxeles válidos / dentro | 1.137.598 / 1.138.398 | 125.761 / 126.483 |
| Cobertura válida por centros de píxel | 99,9297 % | 99,4292 % |
| NDVI medio | 0,0744159 | 0,0842139 |
| SAVI medio | 0,0518875 | 0,0566733 |
| MSAVI2 medio | 0,0457276 | 0,0496898 |
| EVI medio | 0,0482221 | 0,0504930 |

Se conservó el CRS declarado en cada archivo; no se reasignó el hemisferio por intuición. La comparación reproyecta correctamente entre ambas grillas. El área de estudio y sus coordenadas siguen siendo las mismas.

Sobre la grilla Landsat de 30 m se promedian **reflectancias** Sentinel-2 y después se calcula NDVI. Se exige soporte Sentinel-2 válido ≥99,9 % del píxel destino, con relleno inválido en los bordes de la ventana, y validez en ambos sensores. No se promedian simplemente las medias de cada imagen ni se presenta Landsat a 10 m.

Resultado sobre **124.821 píxeles comunes**: media S2 0,0744280; media Landsat 0,0842899; sesgo Landsat − S2 **+0,00986184**; diferencia absoluta media **0,01039952**; correlación **0,84512476**. Separación temporal 0,98953 días. Son medidas de acuerdo, no exactitud: faltan datos de campo, las bandas NIR difieren y cambian fecha, geometría solar y corrección atmosférica.

Para este perímetro Sentinel-2 aporta más detalle espacial; la prueba no demuestra que Landsat ni otro índice sea «mejor» en exactitud. SAVI/MSAVI2 merecen comparación en un ambiente de cobertura escasa, pero no se eligen por producir una imagen más verde.

Fuentes gratuitas: Earth Search para S2; catálogo y COG Landsat de Planetary Computer, con [SAS público temporal](https://planetarycomputer.microsoft.com/docs/concepts/sas/) solo en memoria. El bucket Landsat AWS identificado como requester-pays no se utilizó para leer las bandas. No hay tokens en informes o commits.

IDs locales: Landsat `8304bb13a0fad24eed37952c10051c7e`; S2 `c6c0fc00da45b27621aae16074b0f1a1`; comparación `d2ce6671e309ccee1279b7d94cc57aec`. Resultados exportados en [JSON de comparación](evidencias-vegetacion/comparison.json), [estadísticas S2 CSV](evidencias-vegetacion/sentinel2-stats.csv) e [informe S2](evidencias-vegetacion/sentinel2-report.json).

## Colores y revisión visual

Se mejoró la separación de tonos tierra/ocres/amarillos en valores bajos y verdes progresivos en los altos. Los anclajes son números del índice, no categorías universales de cobertura ni evidencia de vegetación. La escala principal sigue fija de −1 a +1; no se estira cada escena para hacerla parecer más verde. La leyenda incluye muestras numéricas alrededor de 0–0,6, donde la escala completa es difícil de leer.

Se aplica también al visor NDVI anterior. El nuevo caché derivado se llama `ndvi-review-v2-fixed-terreno.png`: los PNG previos v1 y los GeoTIFF históricos se conservan. EVI/SAVI/MSAVI2 no se recortan numéricamente a −1/+1; si quedan fuera de la escala de presentación, el informe cuenta los casos y la pantalla lo informa.

La revisión de capturas detectó y corrigió cifras verticales a 1366 px por herencia de estilos globales de `dl`. Se agregó un control geométrico de sus tarjetas. Capturas finales completas y ampliadas **generadas, abiertas e inspeccionadas** a 1366 y 1800, incluido el visor NDVI histórico:

- [Página completa 1366](evidencias-vegetacion/comparison-1366-full.jpg) · [detalle NDVI 1366](evidencias-vegetacion/NDVI-1366-detail.jpg).
- [Página completa 1800](evidencias-vegetacion/comparison-1800-full.jpg) · [detalle NDVI 1800](evidencias-vegetacion/NDVI-1800-detail.jpg).

## Resultados verificables

| Prueba | Estado | Evidencia/alcance |
|---|---|---|
| Fórmulas, QA, nodata, negativos, calibración, huecos, máscaras, grilla común | PASS | Suite Python completa: 97 pruebas |
| Unitarias web y límites de contratos | PASS | 283 pruebas |
| TypeScript y build V3 | PASS | Advertencias previas de tamaño de bundle y dos assets sin resolver; no errores |
| Playwright multíndice DEMO-001 y DIAB-2026-DEMO, 1366/1800 | PASS | Fixtures HTTP explícitamente sintéticas; dos sensores, cuatro índices, cinco descargas por recorrido, recarga, zoom y almacenamiento intacto |
| Regresión Playwright NDVI y NO₂ | PASS | Ambas demos y ambos tamaños; descargas y recargas |
| Procesamiento real desde la página | PASS | Dos COG reales, mismo polígono, cuatro índices y comparación descritos arriba |
| Descargas reales de la sesión | PASS | JSON, CSV, GeoTIFF y comparación JSON/CSV guardados y abiertos; hash del TIFF coincide con informe |
| NDVI histórico protegido | PASS | SHA-256 original `6467974a594ef140d73f784e1717e3b745dbb825072d39091c17c2e7c7c7332f`; mismos 1.137.598 píxeles válidos y media dentro de 1e-6 |
| Área de estudio/localStorage | PASS | Lectura/importación; snapshots antes/después idénticos en recorridos de navegador |
| Inspección visual completa y ampliada | PASS | Capturas enlazadas; métrica geométrica nueva y revisión manual |
| MODIS real, serie temporal, clasificación supervisada y exactitud de campo | NOT_RUN | Pendientes explícitos; no hay resultados simulados atribuidos a satélites reales |
| Artículo ScienceDirect íntegro / video Landsat íntegro | BLOCKED | Límites de acceso documentados arriba; sí se consultaron fuentes primarias alternativas |
| CI remoto de esta rama | Consultar Checks del PR | Pruebas locales no sustituyen CI; cierre definitivo enlazado en la descripción del PR |
| Merge y publicación | NOT_RUN / HOLD | Pages continúa con la base publicada; no contiene esta nueva entrega |

## Reanudación técnica

Motor: `src/mita/vegetation.py`, `vegetation_api.py`, registro en `web_jobs.py`; almacenamiento nuevo `data-dir/vegetation/`. Loopback y control de origen/encabezado existente, 2 millones de píxeles nativos por escena, 20 análisis/día, 30 búsquedas/hora, 5 GiB locales y un cálculo multíndice simultáneo. Búsquedas persistentes vencen a los 30 minutos. Los errores/reinicios conservan parciales y marcan el trabajo fallido; no reutilizan automáticamente un archivo incompleto. El cálculo de una escena es síncrono en el servicio, puede tardar minutos y continúa aunque se cierre la pestaña; «Actualizar historial» recupera su estado.

No existe algoritmo de recomendación automática. Los desplegables explican las decisiones; el usuario elige. Se mantiene el NDVI histórico accesible desde su pestaña y URL. `sensor`, `indice`, `vegetacion`, `comparacion` y `vzoom` conservan elecciones/resultados en URL. La geometría del resultado se restaura al recargar, sin escribir Área de estudio. Las fechas de una nueva búsqueda se completan de nuevo; aún no forman un estado de búsqueda persistido en la UI.

Pruebas: `python -m pytest`; `node --test tests/react-v3/*.test.mjs`; build existente y `node apps/web-v3/scripts/vegetation-workbench-smoke.mjs` tras materializar overrides. El workflow V3 ejecuta esta última prueba y publica `qa/ambienta-vegetation/` en el artifact QA; esas capturas de CI corresponden a fixtures, no a la escena real de este informe.

Pendientes: adaptador MODIS con QA/fechas y autenticación si hiciera falta; HLS antes de fusionar series entre sensores; comprobación de aerosoles; máscaras y validación para otras regiones/estaciones; validación de campo; importación de estos nuevos esquemas al registro/informe integral; bandas adicionales para agua/humedad/incendios. La elección por caso no debe convertirse en un supuesto índice normativo ni una medición de contaminación.
