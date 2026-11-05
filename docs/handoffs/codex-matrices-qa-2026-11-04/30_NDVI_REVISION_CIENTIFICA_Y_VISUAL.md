# Revisión del NDVI de AMBIENTA: cálculo, representación y uso

Consulta y auditoría: 5 de noviembre de 2026. Escena examinada: `S2B_T19JGN_20250608T143735_L2A`, adquirida el **8 de junio de 2025**, no una imagen actual de noviembre de 2026. Polígono ilustrativo de QA de Diablillos, no límite oficial ni evaluación ambiental del emplazamiento.

**Conclusión:** no se detectó un error numérico en el NDVI de esta escena. La poca variación de color se explica por valores bajos y concentrados. La presentación sí necesita mejorar: el damero se mezcla con los píxeles válidos por la transparencia del PNG, el panel reduce una imagen de 1276 × 1324 a 300 píxeles de alto y falta contexto visual para interpretarla. No se modificaron fórmulas, máscaras ni archivos históricos durante esta revisión.

## Qué se contrastó con fuentes

Para Sentinel-2 se usan B08 (infrarrojo cercano) y B04 (rojo), ambas nativas a 10 m, aplicando `(NIR − rojo)/(NIR + rojo)` sobre reflectancias. Esta combinación coincide con la [implementación documentada de Sentinel Hub](https://custom-scripts.sentinel-hub.com/sentinel-2/ndvi/). Los colores son una convención de representación; una imagen NDVI no es una fotografía y no tiene una paleta universal obligatoria.

Los valores cercanos a cero son compatibles con superficies de baja vegetación; USGS cita roca, arena y nieve entre sus ejemplos. La influencia del suelo y la saturación con vegetación densa impiden convertir el índice en una clasificación universal de salud. Esa referencia respalda la **plausibilidad**, no certifica la cobertura del polígono. Fuente: [USGS, fundamentos del NDVI](https://www.usgs.gov/special-topics/remote-sensing-phenology/science/ndvi-foundation-remote-sensing-phenology).

La escala y el offset deben obtenerse del producto y aplicarse antes del cociente. La documentación oficial explica el cambio radiométrico de Sentinel-2 desde PB 04.00 y el tratamiento de DN=0 como nodata: [Copernicus, productos Sentinel-2](https://sentiwiki.copernicus.eu/web/s2-products). Se consultó además el [ítem STAC exacto de Earth Search](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2B_T19JGN_20250608T143735_L2A): PB 05.11, B04/B08 `scale=0.0001`, `offset=-0.1`, misma grilla de 10 m. El informe de AMBIENTA coincide con esos metadatos. No corresponde retirar el offset para obtener una imagen más verde o igualar una captura de otro visor.

Se revisaron dos debates sobre diferencias radiométricas: [STEP, offset antes/después de PB 04.00](https://forum.step.esa.int/t/how-to-calculate-the-radiometric-offset-sentinel-2-l2a-before-baseline-0400/41046) y [foro CDSE, diferencias con Copernicus Browser](https://forum.dataspace.copernicus.eu/t/sentinel-2-baseline-04-00-offset-csde-stac-derived-ndvi-doesnt-match-copernicus-browser-ndvi/5417). Se usaron para identificar riesgos, no como recetas. La referencia para resolver el significado de `harmonizeValues` es la [documentación vigente de Sentinel Hub/CDSE](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html): en reflectancia controla el recorte de valores negativos; en DN también armoniza entre baselines. No es válido concluir que toda diferencia con Browser se resuelve omitiendo el offset.

La máscara SCL contiene clases de calidad y escena, no una certificación de uso del suelo. El perfil actual conserva 4, 5 y 6 y excluye, entre otras, sombras, nubes y nieve. La SCL procede de 20 m y se lleva a la grilla de cálculo mediante vecino más cercano; ello no crea información de calidad independiente a 10 m. Referencias: [clasificación SCL de Sentinel Hub](https://custom-scripts.sentinel-hub.com/sentinel-2/scene-classification/) y [especificación oficial Sentinel-2](https://sentinels.copernicus.eu/documents/d/sentinel/sentinel-2-products-specification-document-15_1). Mantener agua es una decisión explícita del perfil actual; no se cambió durante esta revisión.

## Auditoría independiente de los archivos

Se volvieron a leer los COG públicos B04, B08, SCL y TCI del ítem exacto. Se recalculó NDVI en float64 con una implementación separada que no importa las funciones de cálculo de MITA. Se compararon todos los píxeles, máscara y grilla con el TIFF descargado. TCI se usa únicamente como contexto visual del mismo momento, no para calcular NDVI ni como validación de campo.

| Prueba | Estado | Resultado |
|---|---|---|
| Escala/offset frente al STAC original | PASS | 0,0001 y −0,1 para ambas bandas |
| B04/B08 y grilla | PASS | 10 m; grillas nativas iguales; salida EPSG:32719 |
| Máscara independiente frente al TIFF | PASS | Igualdad de validez en todos los píxeles |
| NDVI recalculado desde DN | PASS | Diferencia absoluta máxima 0,000000244892; tolerancia de revisión 0,000001, sin pretensión normativa |
| Píxeles en el polígono | PASS | 1.138.398; válidos 1.137.598 (99,9297 %) |
| Estadística | PASS | Mínimo −0,219774; media 0,074416; mediana 0,075013; máximo 0,319310 |
| Dispersión | PASS | P02 0,028541; P98 0,112299; 91,6099 % de válidos entre 0 y 0,1 |
| PNG y transparencia | FAIL de presentación | Todos los válidos tienen alfa 208/255: aproximadamente 81,6 % de opacidad; el damero se mezcla también dentro del contorno |
| Contraste y legibilidad | Mejorable | Escala fija adecuada para comparar, insuficiente por sí sola para explorar variaciones pequeñas; panel sin zoom |
| Campo / clasificación ambiental | NOT_RUN | Sin observaciones de campo ni clasificación validada |
| Otro procesador externo independiente | NOT_RUN | No se ejecutó SNAP/QGIS/Copernicus sobre la misma escena como validación cruzada completa |
| Cambio de código / despliegue | NOT_RUN | Revisión y artefactos únicamente; datos históricos conservados |

La SCL dentro del polígono contiene 800 píxeles de clase 2, 1.137.594 de clase 5 y 4 de clase 6. Los 800 de sombra quedan excluidos. No hay píxeles SCL 4 en este recorte. Es consistente con la imagen de terreno desnudo, pero sigue siendo una clasificación automática. **99,93 % válido no significa 99,93 % de vegetación sana ni exactitud científica.**

Hay 558 píxeles de NDVI negativo: 554 están etiquetados SCL 5 y 4 SCL 6. Por lo tanto, no debe mostrarse automáticamente “agua” para cualquier NDVI negativo. Tampoco se infiere contaminación, impacto, recuperación ambiental o cumplimiento por un valor bajo.

El 96 % central ocupa solo aproximadamente 0,0838 unidades del intervalo total de 2 unidades. Es esperable que el mapa con escala −1 a +1 se parezca a una superficie uniforme. Como control didáctico, omitir incorrectamente el offset daría una media cercana a 0,050790 en estos mismos píxeles. Esa diferencia no es una razón para cambiar la calibración: demuestra por qué hay que conservarla.

## Visualización propuesta, sin cambiar el NDVI

La figura `AMBIENTA_NDVI_Auditoria_Visual.png` fue generada y abierta para revisión. Compara color verdadero de la misma escena, NDVI opaco con escala fija, contraste local P02–P98 y distribución. El contraste local usa una paleta distinta y una leyenda explícita; satura los extremos únicamente en la visualización y no cambia valores, máscara, estadísticas ni TIFF.

1. Mostrar píxeles válidos opacos en la vista independiente; transparencia total solo para nodata/exterior. Reservar la opacidad variable para una superposición cartográfica con control separado.
2. Incorporar zoom, consulta del valor de un píxel y contexto RGB/NDVI de la misma adquisición. Conservar proyección y referencia espacial al implementar el visor.
3. Mantener la escala fija para comparación y ofrecer un modo de contraste local identificado, con límites numéricos visibles. No convertir percentiles en umbrales de vegetación o impacto.
4. Mostrar histograma, mediana y percentiles junto al promedio. Explicar que “válido” corresponde a una regla de calidad.
5. Antes de comparar fechas, mantener área, producto, calibración, máscaras y criterio de visualización; evaluar nubosidad local y estacionalidad. Una sola adquisición no demuestra una tendencia.

El [manual de Copernicus Browser](https://documentation.dataspace.copernicus.eu/Applications/Browser.html) documenta selección de AOI, visualizaciones RGB/índices, histograma y análisis temporal; es una referencia funcional para las mejoras anteriores. El [foro STEP sobre color y NDVI](https://forum.step.esa.int/t/color-images-and-ndvi-images/483) muestra la distinción recurrente entre cálculo y manipulación del color. Las decisiones de diseño de esta auditoría son propuestas propias, no exigencias normativas de esas fuentes.

Para ambientes de baja cobertura, puede estudiarse SAVI como herramienta futura separada, sin reemplazar el NDVI aprobado: [USGS, SAVI e influencia del brillo del suelo](https://www.usgs.gov/landsat-missions/landsat-soil-adjusted-vegetation-index). No se incorporó un índice nuevo ni se adelantó el trabajo sobre contaminantes criterio.

## Videos y materiales gratuitos revisados

| Recurso | Qué aporta | Alcance efectivamente revisado |
|---|---|---|
| [NASA ARSET: NDVI & QGIS, Part 1](https://www.youtube.com/watch?v=n1kU1bBU2tQ) | Fundamentos e introducción al trabajo en QGIS; capítulos de conceptos a partir de 7:24 | Página, descripción, capítulos y captura de la introducción. No se obtuvo una transcripción completa; el avance a otros fotogramas no se pudo verificar |
| [NASA ARSET: Deriving NDVI from Landsat, Part 2/4](https://www.youtube.com/watch?v=elPbB8k2Sxg) | Recorrido de adquisición y cálculo en QGIS | Descripción, capítulos y enlace a materiales. Las bandas y calibraciones de Landsat no deben trasladarse literalmente a Sentinel-2 |
| [CDSE: A short guide to Copernicus Browser](https://www.youtube.com/watch?v=F0lIn5r6ZWk) | Visualizaciones (5:08), efectos (5:45), descarga/exportación (6:16–6:45) | Descripción y capítulos oficiales; el contenido se contrastó con el manual del Browser, sin afirmar reproducción íntegra |
| [Playlist oficial: Sentinel Hub APIs](https://www.youtube.com/playlist?list=PLj4KwRQTBlPL3CVwpaBXl3VrO0_V3VX_Q) | Visualizar datos y crear series NDVI desde las APIs | Enlace y alcance verificados en la [publicación de CDSE](https://dataspace.copernicus.eu/news/2024-2-20-copernicus-browser-updates-and-new-videos); no se revisaron todos los videos |

La revisión de YouTube es **parcial**, no se presenta como visionado completo: las solicitudes gratuitas de subtítulos/transcripción no devolvieron texto utilizable y los saltos de reproducción no produjeron fotogramas decodificados verificables. El PDF histórico ARSET `ndvipart1.pdf` fue localizado, pero su descarga directa falló por validación TLS y el acceso web por tamaño; no se eludió esa validación. Los hallazgos técnicos se fundamentan en documentación oficial accesible y en la auditoría numérica de la escena. No se gastaron créditos TinyFish ni vidIQ.

No es una revisión exhaustiva de toda la bibliografía NDVI ni una validación de campo. Evidencias reproducibles y resultados: `AMBIENTA_NDVI_Revision_Cientifica.zip`, con manifiesto de integridad. Código de la aplicación en este punto: interfaz `11d4065e934455147322351b531b5b90fdc01392` / PR #92; motor privado `025cf656fab3171053efa92fc7ab2cbe9b05664a` / PR #8. CI de esos cambios ya registrado en el handoff 27; esta investigación no modifica esos commits.
