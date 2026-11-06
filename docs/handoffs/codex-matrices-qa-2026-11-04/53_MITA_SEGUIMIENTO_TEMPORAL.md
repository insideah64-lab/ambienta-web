# MITA: seguimiento temporal de vegetación — 2026-11-06

Primera entrega de seguimiento sobre cualquier Polygon/MultiPolygon WGS84 admitido por el piloto, incluidos huecos. Se integra en **Vegetación → Tipo de análisis → Seguimiento temporal**. No modifica los esquemas, almacenamiento ni fórmulas aprobadas de resultados anteriores.

Estado de publicación: **HOLD**. PRs borrador: [web #101](https://github.com/insideah64-lab/ambienta-web/pull/101), apilado sobre #100, y [motor privado #14](https://github.com/insideah64-lab/plataforma-ambiental-argentina/pull/14), apilado sobre #13. No fusionar ni desplegar; Motor HEAD `569b5aa2b527ebf988faa77fce35d682c14e7087`: CI completo PASS (runs 42157701591 y 42157765814, Python 3.11/3.12 y web). Web código HEAD `5cf81417ba2a8a926a0357e33c6d64c324626a05`; el commit posterior solo incorpora documentación y evidencia autorizada. CI web completo PASS para ese HEAD: run 42157912886, incluidos navegador, diagnóstico P0, exportaciones y 44 pasos satisfactorios. Esta actualización documental se apila en un PR separado sobre #101; no cambia el código probado. El cierre de CI se registra en los PRs y en el archivo de estado posterior.

Bases verificadas: web `a3f14ec4c94385074d0ee40848a5105d139ebfb8`; motor `d66860baf13f4c2a357441daae550200f510c05b`. Main público sigue en `841f1356f86a3561be70fb0d3c7ce961a8d3640b`. Rama nueva `feature/mita-seguimiento-temporal-2026-11-06`.

## Comportamiento y método

- Sentinel-2 a 10 m o Landsat 8/9 a 30 m; NDVI, SAVI, MSAVI2 y EVI. Cada serie exige mismo polígono exacto, familia de sensores, colección, máscara de calidad y fórmula. No se presenta como HLS ni se mezclan sensores sin armonización.
- De 2 a 12 fechas, una adquisición por día UTC, período máximo 366 días. Primera página de catálogo limitada a 20 escenas antes del filtrado: la selección **no acredita un catálogo completo**.
- Cobertura mínima por fecha configurable (80 % inicial), soporte común mínimo configurable (50 % inicial). Son criterios analíticos exploratorios, no umbrales normativos. Se conservan fechas excluidas con razones y estadísticas nativas.
- Grilla de primera fecha elegible; vecino próximo a igual resolución nominal; máscara de intersección de píxeles válidos de **todas** las fechas elegibles. Se verifica SHA-256, banda, resolución, recuentos y cobertura de toda la delimitación antes del cálculo.
- Gráfico con eje temporal proporcional, media y percentiles espaciales P25–P75 sobre soporte común. P25–P75 **no es intervalo de confianza**. Escala vertical explícita; tabla accesible con medias nativas y comunes. Sin interpolación temporal; los segmentos solo conectan observaciones.
- Cambio = índice final − inicial, sin recortar valores. Rampa divergente naranja/neutro/turquesa con dominio simétrico seleccionable ±0,1/0,25/1/2. Color saturado fuera del rango; GeoTIFF conserva números. Transparencia fuera del soporte común. Zoom existente y rango persisten en URL. El signo no acredita mejora/daño ni causa.
- Nuevos productos inmutables `mita.vegetation-series/1`, descarga JSON/CSV y GeoTIFF georreferenciado del cambio. Soporte insuficiente produce valores nulos y ningún mapa; nunca ceros inventados.
- Tandas persistentes, secuenciales y verificables; reutilizan adquisiciones coincidentes con hash válido. Continúan al cerrar pestaña. Cancelar termina la adquisición actual y conserva resultados; reiniciar servicio marca tareas interrumpidas y conserva archivos.
- Límites del piloto: 2 millones de píxeles nativos por adquisición, 20 adquisiciones nuevas/día, 20 series/día, 5 GiB, un cálculo activo. No se publica este servicio local en Internet.

## Evidencia real gratuita

Polígono ilustrativo no oficial del caso Diablillos, proyecto `DIAB-2026-DEMO`. Tanda `308716bf9aca95fda86f4fe6b3f48f0b`; serie `6ea60b7337eb52a9e9c51311f5796647`. Escenas Sentinel-2 L2A 19JGN del 5, 8, 13 y 18 de junio de 2025. El día 8 reutilizó el resultado verificado existente.

| Fecha UTC | Píxeles válidos nativos | Uso | Media NDVI común |
|---|---:|---|---:|
| 2025-06-05 | 99,9575 % | Elegible | 0,0679049020 |
| 2025-06-08 | 99,9297 % | Elegible | 0,0744428645 |
| 2025-06-13 | 31,6418 % | Excluida por criterio 80 % | Sin datos comunes publicados |
| 2025-06-18 | 95,9275 % | Elegible | 0,0744885271 |

Soporte común: **1.091.969 píxeles, 95,9215 %**. ΔNDVI medio 18−5 junio: **+0,0065836251**, mínimo −0,3933220506, máximo +0,2847143412. El cambio pequeño no demuestra una causa ni un aumento real de biomasa sin validación independiente.

SHA-256 del GeoTIFF descargado: `9f1ea44e6dc318766724b71047c99a477a13d7d8fd6a2f15ec159246f8b4838b`. Recálculo independiente con rasterio/numpy: máscara, valores y georreferenciación coinciden exactamente. El NDVI histórico mantiene SHA `6467974a594ef140d73f784e1717e3b745dbb825072d39091c17c2e7c7c7332f`.

Evidencia local: `work/temporal-real-qa/`: JSON/CSV/GeoTIFF descargados a 1366 y 1800, capturas full/result/chart/change, `results.json`, `numerical-audit.json`. Se abrieron y revisaron visualmente **full, chart y change en ambos anchos**. Copia de capturas y auditorías en `evidencias-mita-temporal/`; las pruebas CI utilizan fixtures marcados SYNTHETIC, separados de estas adquisiciones reales.

También se crearon series reales SAVI `0511753bf916f015f2799de719e935fc`, MSAVI2 `28c08afa23c6b80c94fce069d5b1be4d` y EVI `e9c224d020d24c12707a5ffe4e594063` a partir de las mismas adquisiciones. Sus GeoTIFF descargados coinciden exactamente con final−inicial calculado independientemente. Las diferencias medias son +0,0039262987, +0,0033750234 y +0,0038099100, respectivamente. No se descargaron nuevas escenas para esta comprobación.

La revisión automática detuvo inicialmente la carga binaria de capturas por falta de autorización pública explícita. El usuario autorizó después publicar las seis capturas y los informes JSON/CSV en este repositorio público; se adjuntan en `evidencias-mita-temporal/` con manifiesto SHA-256. Las copias JPEG son compactas para revisión; los PNG a resolución original y los GeoTIFF descargados permanecen en el archivo de continuidad local.

## Resultados

| Verificación | Estado | Evidencia |
|---|---|---|
| Motor completo + cancelación, integridad, huecos, soporte nulo | PASS | 113 pruebas Python |
| Modelos web y regresiones existentes | PASS | 290 pruebas Node |
| Build y TypeScript | PASS | build V3 |
| Temporal en DEMO-001 y Diablillos, 1366/1800 | PASS | Playwright sintético, 3 archivos descargados, reload, comparación nueva, localStorage intacto |
| Vegetación anterior, NDVI histórico, NO₂ e informes | PASS | cuatro smokes existentes |
| Tanda real de 4 fechas y recarga con trabajo en curso | PASS | 4 terminadas, 1 reutilizada; 1 excluida por calidad al construir serie |
| Exportaciones y recálculo independiente reales | PASS | JSON/CSV/GeoTIFF descargados en ambos anchos; hash y valores exactos |
| Consola/red y revisión visual real | PASS | sin pageerrors ni HTTP >=400; capturas abiertas |
| CI completo del motor #14 | PASS | runs 42157701591 y 42157765814, Python 3.11/3.12 y web |
| CI completo web #101 | PASS | run 42157912886, HEAD `5cf81417ba2a8a926a0357e33c6d64c324626a05`, 44 pasos satisfactorios |
| Publicación de evidencia real autorizada | PASS | seis capturas JPEG, JSON/CSV y manifiesto; autorización explícita posterior al bloqueo |
| SAVI, MSAVI2 y EVI temporales reales | PASS | GeoTIFF descargados, diferencias exactas sobre las mismas adquisiciones |
| Despliegue/GitHub Pages de esta entrega | NOT_RUN | HOLD; no publicado |
| Validación agronómica independiente y causal | NOT_RUN | requiere campo, cultivo, clima y protocolo |
| Serie temporal Landsat real y otros polígonos reales | NOT_RUN | perfiles existentes y tests sintéticos; ampliar QA en siguiente etapa |

## Continuación

1. Revisar y cerrar CI de ambos PRs sin fusionar/desplegar bajo HOLD.
2. Validar temporada completa con lote agrícola independiente y observaciones de campo; documentar cultivo, fenología, riego, suelo y clima. No establecer umbrales universales.
3. Ampliar catálogo/paginación, temporadas y tamaño con presupuesto explícito. Evaluar HLS para mezcla armonizada Sentinel/Landsat y MODIS para escala regional.
4. Agregar comparaciones multitemporales más amplias, anomalías respecto de referencias estacionales y zonificación únicamente después de definir y validar su método.
5. Completar producto profesional con autorización, almacenamiento y trabajos remotos robustos antes de exponer el motor fuera del equipo local.

Referencias primarias revisadas: [USGS Remote Sensing Phenology](https://www.usgs.gov/centers/eros/remote-sensing-phenology), [NASA HLS Vegetation Indices](https://science.nasa.gov/mission/landsat/hls-vegetation-indices/). Nuestra serie no usa HLS: conserva los perfiles existentes (Sentinel B08, Landsat SR) y declara esa diferencia.
