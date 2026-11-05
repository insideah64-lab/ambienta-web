# Área de estudio → NDVI: delimitaciones generales

Fecha: 2026-11-05. Rama nueva `feature/mita-area-ndvi-general-2026-11-05`, basada en `d490c76f96824d09c35277f87381cbee752920ee` (PR #91). CI del nuevo commit: NOT_RUN al escribir este documento; cierre y enlaces en el nuevo PR. HOLD vigente: no fusionar ni desplegar.

## Requisito y comportamiento

El cálculo debe respetar cualquier delimitación válida elegida por el operador, dentro de la capacidad del piloto. No se vincula a una figura, coordenadas ni proyecto de ejemplo específicos. Admite Polygon/MultiPolygon WGS84, concavidades, huecos y partes separadas; el exterior se excluye de NDVI y estadísticas. Una colección con varias entidades debe prepararse como un único MultiPolygon; no se unen fuentes automáticamente.

Se agrega **Calcular NDVI dentro de este perímetro** junto a las acciones del perímetro guardado en Área de estudio. Abre MITA y copia la geometría guardada del caso actual en este navegador, sin modificar fuente, respaldos ni zonificación. Se muestra el nombre de la delimitación seleccionada y se solicitan período y escena. El historial de trabajos anteriores no debe sustituir esa selección. Cada trabajo mantiene su propia geometría al recargar. También continúa disponible la importación directa de GeoJSON.

FAIL identificado: el límite anterior de 0,1° por lado rechazaba el contorno ilustrativo de la captura, aunque podía procesarse dentro del límite de memoria. Se reemplaza por un presupuesto de píxeles, con una estimación conservadora a 10 m y rechazo explícito si supera 12 millones. No se afirma que la estimación represente superficie ni una resolución garantizada. El tamaño exacto de la grilla se comprueba antes de leer las bandas. No se simplifica ni cambia el contorno para hacerlo entrar. Se mantienen los demás límites (2.000 posiciones, 180 KB al importar y período de hasta 366 días). No se cambia NDVI, calibración ni criterios de calidad.

## Resultados de verificación

| Comprobación | Estado | Evidencia |
|---|---|---|
| Unitarias web | PASS | 267 pruebas; distintos países/coordenadas, huecos y multipolígonos; extensión mayor de 0,1° admitida dentro del presupuesto y exceso rechazado |
| Build/TypeScript | PASS | Compilación local; advertencias preexistentes de assets y tamaño |
| Pruebas del motor | PASS | 61 pruebas; validación general por presupuesto, sin dependencia del caso |
| Área → MITA, ambas demos, 1366/1800 | PASS | Playwright comprueba geometría y extensión exactas en la petición, nombre de fuente, preservación del almacenamiento y recarga del trabajo |
| Historial anterior | PASS | La entrada desde Área no selecciona automáticamente un trabajo anterior ni pierde la máscara nueva |
| Procesamiento real | PASS | Escena `S2B_T19JGN_20250608T143735_L2A`, perímetro ilustrativo QA de 15 vértices; no acredita límite real de Diablillos |
| Resultado real | PASS | Grilla 1276 × 1324, EPSG:32719; 1.138.398 píxeles dentro del polígono, 1.137.598 válidos; mínimo −0,219774, promedio 0,074416, máximo 0,319310 |
| Archivos descargados | PASS | TIFF/JSON descargados; SHA coincidente; segunda lectura con máscara por centros reproyectados, exterior nodata, alfa PNG igual a validez del TIFF y estadísticas recalculadas |
| Revisión visual | PASS | Cuatro capturas reales completas/panel a 1366/1800 abiertas y revisadas |
| Datos y almacenamiento previo | PASS | Fuente de Área, ventana y demás registros sin cambios; requiere revisión y confirmación para vincular el informe |
| CI nuevo | NOT_RUN | Al crear commit; resultado final en cuerpo del PR |
| Merge / Pages | NOT_RUN | HOLD vigente; implementación disponible en servicio local, no publicada |
| Delimitación oficial / evaluación ambiental | NOT_RUN | Datos de QA y prueba técnica, no certificación |

La prueba real usa el contorno ilustrativo existente como una entrada más; la implementación no contiene un caso especial para esa geometría. Las pruebas generales incluyen otras ubicaciones y formas. Los huecos y multipolígonos mantienen además las regresiones de la etapa anterior.

Capturas reproducibles: artefacto CI `ambienta-matrices-handoff-qa`, carpeta `qa/ambienta-ndvi`, nombres `*-area-to-ndvi-*`. Entrega local `AMBIENTA_Area_NDVI_General_QA.zip`: descargas satelitales, capturas revisadas, regresión de las dos demos y manifiesto SHA-256. Conservar junto al handoff. Los datos del navegador de QA son independientes del navegador del usuario.

Para usarlo, recargar Área de estudio en el servicio local, guardar/importar/dibujar el perímetro y pulsar el acceso a NDVI. El contorno no debe reemplazarse por el piloto Salta. El origen local no copia automáticamente los datos guardados en GitHub Pages: exportar/importar el perímetro si corresponde. Pendientes: revisión e integración de PR dependientes, despliegue autorizado, mosaicos para áreas que crucen escenas, visor georreferenciado y series temporales. Una única escena debe cubrir el contorno completo. Sin gasto de créditos TinyFish ni vidIQ.
