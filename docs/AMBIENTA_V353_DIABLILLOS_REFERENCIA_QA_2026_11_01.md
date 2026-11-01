# AMBIENTA V3.5.3 — Diablillos, referencia cartográfica de ensayo

Fecha: 2026-11-01. Rama `feature/ambienta-v353-diablillos-referencia-qa-2026-11-01`; PR [#16](https://github.com/insideah64-lab/ambienta-web/pull/16).

## Fuente y lo que realmente está documentado
AbraSilver Resource Corp., *Updated NI 43-101 Technical Report, Pre-Feasibility Study for the Diablillos Ag-Au Project, Salta & Catamarca*, publicado el 17-01-2025, sección 4, establece un centro de propiedad aproximadamente **25°18′ S, 66°50′ O** (EPSG:4326: lon = −66.833333333…, lat = −25.300000), y una propiedad de **11.403 ha en ese informe**.
- Fuente primaria: https://www.abrasilver.com/_resources/tech-reports/NI-43-101-Technical-Report-PFS-Diablillos-Project.pdf?v=040611
- El comunicado de AbraSilver 17-02-2026 describe adquisiciones y acuerdos adicionales alrededor de Diablillos, **más de 6.200 hectáreas añadidas a su paquete de tierras**. No se debe presumir que el área de 2025 describe el perímetro de 2026: https://www.abrasilver.com/news-releases/abrasilver-consolidates-diablillos-footprint-with-multiple-acquisitions-to-add-future-exploration-upside-and-expansion-potential

**Advertencia rigurosa**: ni la fuente de 2025 ni el comunicado de 2026, en el material revisado, proporcionan el conjunto completo de vértices catastrales georreferenciados para recuperar una geometría válida de concesiones. El contorno en `diablillos-reference-qa.mjs` NO se digitalizó de una capa oficial y **sus 15 vértices fueron fabricados para el laboratorio usando el centro y una escala aproximada de superficie del reporte de 2025**. Nunca se presenta como límite legal, concesión, zona de impacto, evaluación de impacto ni derecho de acceso. No interpolar resultados ambientales a partir de su forma.

## Comportamiento
- URL de ensayo explícito: `https://insideah64-lab.github.io/ambienta-web/v3/?caso=diablillos&perimetro=referencia-qa#/area`.
- En navegador sin perímetro previo, el enlace inserta **solo** el modelo sintético QA para comprobar la visualización; cada fuente se marca `SYNTHETIC_QA_ONLY` y `DECLARED_NOT_VERIFIED`.
- Sin parámetro, la visita normal **no precarga ninguna geometría**; Área de estudio ofrece un botón voluntario de muestra.
- Si el navegador ya almacena un perímetro, **nunca se sobrescribe** automáticamente, incluso con el enlace QA. Se respeta igualmente la ventana AOI previa.
- Se aplica una ventana de consulta técnica sugerida solamente si no existe otra ventana local. BBOX y perímetro siguen separados.
- Las franjas de zonificación A-D **no** se generan automáticamente.
- El visor SIG coloca un borde y relleno semitransparente, y etiqueta persistentemente `DIABLILLOS · PERÍMETRO ILUSTRATIVO QA · NO OFICIAL`.
- El GeoJSON exportable del modelo incluye el aviso: `examples/diablillos/contorno-ilustrativo-qa-2025.geojson`.

## QA y capturas
- `tests/react-v3/diablillos-reference-qa.test.mjs` valida la fuente, hash, centroides y conservación de originales.
- `v3/overrides/scripts/diablillos-reference-qa-smoke.mjs` abre la URL con Chromium y comprueba estado, importación visible, exportación idéntica, navegación, recarga, ausencia de bandas y no sobrescritura. Captura cuatro PNG de Área de estudio y Mapas y SIG.
- `.github/workflows/v3-preview.yml` conserva las capturas 30 días en artifact `ambienta-diablillos-v353-capturas`. Revisar las imágenes y resultado global de CI antes de fusionar.
- Compilaciones V1/V2 y versiones V3.6–V3.9 no se mezclan con esta entrega.

## Criterio de aceptación
Que se vean perímetros irregulares de forma comprensible y etiquetados, sin cajas artificiales de subáreas ni asignaciones ambientales. Si hay problemas de resolución, controlar el tamaño de canvas, la carga de teselas de OSM, la prioridad de superposiciones y el zoom. No declarar perímetro real sin material oficial de vértices y CRS verificables.
