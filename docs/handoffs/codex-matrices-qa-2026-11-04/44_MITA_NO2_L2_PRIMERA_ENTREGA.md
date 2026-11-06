# MITA atmosférico: primera entrega NO₂ L2 — 2026-11-05

## Continuidad y alcance

Rama feature/mita-no2-l2-2026-11-05. Base pública PR #97 / 72191461d0051add7b350af0ab75c34962f998cf; base privada PR #11 / c4876f4aefab01debde226e64c375ce073d96e76. HEAD verificados antes de publicar. Main público permanece 841f1356f86a3561be70fb0d3c7ce961a8d3640b. HOLD: sin merge ni despliegue. Nuevos commits y cierre CI en los PR y resultado final local.

El usuario solicita una herramienta para cualquier proyecto y delimitación, ampliable a otros contaminantes. Esta entrega implementa una ruta funcional completa para NO₂: carga local de NetCDF nativo → control de calidad → intersección con polígono → estadísticas, huellas y exportación. La descarga automática desde catálogo y las series temporales quedan pendientes; no se presenta una pantalla de botones sin procesamiento.

## Fuentes y perfil científico

Manual oficial leído: Sentinel-5P L2 NO₂ PUM 4.1.0 (procesador 2.4.0), sección 8.6: filtro qa_value >0.75 para uso general. Perfil implementado s5p-no2-tropospheric-qa-gt075-v1. El procesador del archivo real utilizado es 2.8.0 y queda registrado, sin afirmar validación externa de todas sus versiones.

- Manual: https://sentinels.copernicus.eu/documents/247904/2474726/Sentinel-5P-Level-2-Product-User-Manual-Nitrogen-Dioxide.pdf
- Productos/unidades: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S5PL2.html
- Distribución gratuita de NetCDF usada en QA: https://registry.opendata.aws/sentinel5p/
- Contexto futuro PM: https://atmosphere.copernicus.eu/guide-cams-visual-products-our-atmosphere-your-fingertips . Modelos superficiales y columnas satelitales requieren perfiles separados.

Se lee exclusivamente PRODUCT/nitrogendioxide_tropospheric_column en mol m-2 (variantes textuales equivalentes admitidas), qa_value decodificado por NetCDF y los cuatro vértices de cada huella desde SUPPORT_DATA/GEOLOCATIONS. No se convierten columnas totales, µg/m³, emisiones ni índices de salud. Las fechas y el identificador nativo id (o product_name) son obligatorios. Prueba real detectó que el archivo usa id, no product_name, y se incorporó esa compatibilidad.

Cada Polygon/MultiPolygon WGS84 conserva huecos/partes; no se usa el rectángulo como sustituto. Se seleccionan huellas por intersección real y área positiva. QA estrictamente >0.75 y <=1; nodata/no finitos descartados; negativos válidos conservados. Media ponderada por área geodésica WGS84 de cada intersección; una superposición puede aportar más de una vez a la media. Cobertura = área de la unión válida / área de la delimitación, no suma de porcentajes de huellas. Una adquisición no representa un promedio diario ni una serie temporal.

El esquema muestra contorno de estudio, huellas nativas y sus intersecciones coloreadas; no remuestrea ni simula resolución de Sentinel-2. Escala visual fija −2e-5..2e-4 mol/m², azul/violeta, sin categorías normativas; saturación de color solo visual. Sin mapa base en esta primera entrega. Cobertura parcial y ausencia de observaciones tienen mensajes explícitos.

## Arquitectura, persistencia y límites

Motor privado: no2.py, no2_api.py, registro aislado desde web_jobs.py; dependencias netCDF4>=1.7,<2 y pyproj>=3.6,<4. Plan JSON y carga binaria por streaming en dos pasos, mismo origen/loopback y encabezado existente, sin credenciales nuevas. Límite binario solo en la ruta PUT específica; los demás cuerpos conservan 200 KB. NetCDF hasta 512 MiB, 4 millones de celdas, 5.000 intersecciones, 2.000 coordenadas por recorte y 100.000 de salida. Sin simplificación ni truncamiento automático. Un procesamiento NO₂ a la vez; 20 análisis/día y presupuesto local de 10 GiB. Antimeridiano no soportado en el piloto.

Almacenamiento nuevo data_dir/no2/{id}: request.json, source.nc y report.json; sin migrar jobs.sqlite3, productos NDVI, storage navegador, V1/V2 ni esquemas previos. Cargas/análisis interrumpidos quedan fallidos y conservan archivos parciales/completos. Un original recibido no se sobrescribe. Consultas y archivos comprueban proyecto e id; un proyecto ajeno recibe 404. Persistencia en servicio local; el parámetro URL no2 restaura el resultado y su delimitación snapshot al recargar. El adaptador de Área de estudio lee las claves existentes sin escribirlas; la importación GeoJSON sirve independientemente de los casos de ejemplo.

Frontend público: pestañas Vegetación / Atmósfera, No2Model y No2Workbench separados de MitaModel NDVI 0.2.0. No se importan NO₂ por el parser de NDVI. El informe integral/registro unificado todavía no incorpora este esquema nuevo. No hay código NO₂ condicionado a identificadores DEMO; los tests incluyen ANY-PROJECT/GENERAL y ambos casos de interfaz. El entorno demo es un contenedor de prueba: los números NO₂ se leen del archivo, no se sintetizan desde los datos del proyecto.

## Prueba real reproducible

Archivo gratuito MEEO/AWS:
https://meeo-s5p.s3.amazonaws.com/NRTI/L2__NO2___/2025/06/08/S5P_NRTI_L2__NO2____20250608T181909_20250608T182409_39659_03_020800_20250608T190157.nc

SHA-256: 5e1ce7ed08a5e1f15016a304d8ecfa13d8a743f1aab543462a99b8b15e86e14a. Procesador 2.8.0; adquisición 2025-06-08T18:19:03Z..18:24:16Z; resolución declarada 5.5x3.5 km2 (se conserva el texto del archivo).

Diablillos: snapshot exacto del polígono conservado en el trabajo NDVI 1b93d1e5806220a8427e7431c569a0bd, sin tocar Área ni NDVI. Resultado NO₂ 57adaa3c4dde738b0adeea374674214c: 2 válidas /13 intersectadas, 11 rechazadas; cobertura 0.06973556346200635; mínimo 1.6602598407189362e-6, máximo 1.3738063898927066e-5 y media ponderada 1.6657342820280387e-6 mol/m². Es solo el 6.97% del área, no una caracterización completa del proyecto.

Segunda delimitación regional QA en DEMO-001: rectángulo [-66.9,-25.36,-66.77,-25.24], importado para la prueba, NO reemplaza el perímetro del proyecto. Resultado d9e95136…: 3 válidas /16, cobertura 10.4772%, media 1.8146952007205145e-6 mol/m².

Se corrigió un error de selección en el guion QA: la coincidencia T181909 también encontraba el fin del segmento anterior T181409..181909. Ese segmento no cubre el área. El guion final selecciona el inicio exacto ____20250608T181909_; los registros de QA previos sin cobertura se conservan. Esto no fue un fallo del filtro QA ni del lector: cada resultado conserva el id y SHA de su archivo. Las primeras conclusiones verbales sobre ausencia total se corrigieron con la prueba final.

Auditoría independiente del NetCDF y CSV descargados: observaciones [75,258] y [75,259], QA y valores originales coincidentes. Media con pesos de proyección equivalente EPSG:6933 =1.6657342259688007e-6; diferencia relativa frente al método geodésico 3.37e-8. Cobertura equivalente 0.0697359559038112; diferencia relativa 5.63e-6. Son discrepancias entre métodos de área, no incertidumbres ni intervalos de confianza.

## Resultados

| Comprobación | Estado | Evidencia |
|---|---|---|
| Unitarias públicas | PASS | 277 tests |
| Motor privado | PASS | 85 tests, incluido NetCDF sintético real, QA escalado/borde .75, negativos, huecos, vacío, unidades, otra especie, peso de área, proyecto, persistencia, límites y reinicio |
| TypeScript/Vite | PASS | build local |
| Playwright NO₂ | PASS | ambas demos 1366/1800, fixtures HTTP rotulados sintéticos, carga, archivo vacío invalida selección anterior, exportaciones verificadas, recarga/snapshot y acceso a NDVI |
| Regresión NDVI | PASS | ambos casos 1366/1800, descarga y recarga |
| NetCDF público real → navegador | PASS | polígono exacto, 2/13, reporte parcial, JSON/CSV/NetCDF descargados como archivos, SHA y contenido original idénticos, 404 proyecto ajeno |
| Auditoría independiente | PASS | NetCDF directo + CSV y pesos EPSG6933 |
| Capturas abiertas | PASS | completas/paneles reales y regionales a 1366/1800 |
| CI remoto de esta iteración | NOT_RUN | al crear documento; cierre definitivo en PR |
| Descarga automática, series, otros gases/PM | NOT_RUN | siguientes etapas; no se simulan resultados |
| Merge/despliegue/Pages nuevo | NOT_RUN | HOLD |

Evidencias locales: work/no2-live-qa/ y work/no2-source/download-manifest.json; guion work/test-no2-live.mjs (requiere el archivo público, servicio local y ambos casos demo). Fixtures CI: v3/overrides/scripts/no2-workbench-smoke.mjs y tests/fixtures/no2-fixture.mjs. El CI conserva qa/ambienta-no2 en el artefacto habitual. Paquete local AMBIENTA_NO2_L2_QA.zip con manifiesto SHA.

## Próximos pasos

1. Búsqueda/descarga de escenas por polígono y fecha, con manifiesto de fuente, cobertura, modo NRTI/OFFL/RPRO, versiones y deduplicación. No usar URLs arbitrarias proporcionadas desde el navegador.
2. Series temporales y composición documentada: cobertura por fecha, superposición y sesgo de muestreo; evitar promedios diarios ficticios de una única pasada.
3. Adaptadores SO₂/CO con variables, unidades y filtros propios. Aerosoles y PM modelado separados; sin conversiones automáticas a superficie.
4. Integración revisada al informe técnico y despliegue autenticado posterior. Revisar bases apiladas antes de integrar; no omitir PR anteriores.
