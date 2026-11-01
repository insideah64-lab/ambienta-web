# AMBIENTA V3.4 — Separación funcional: Área de estudio y Mapas y SIG

**Estado:** desarrollo React V3 en rama experimental. V1 y V2 conservadas.

## Problema

Las rutas `/area` y `/mapas` montaban exactamente el mismo componente `AreaEstudio`. Esto repetía la ficha territorial, las herramientas GIS, la carga de capas y el editor de subáreas en dos entradas del menú, generando expectativas equivocadas y navegación redundante.

## Nuevo contrato funcional

| Módulo | Responsabilidad única | Herramientas y resultados |
|---|---|---|
| **Área de estudio** (`#/area`) | Definir **qué territorio se estudia** | Ficha del proyecto, ventana AOI, Georef de territorio/administración, delimitación de un polígono de ensayo, cuatro zonas A–D, hectáreas, revisión territorial compacta, asociaciones documentales de QA |
| **Mapas y SIG** (`#/mapas`) | Analizar **cómo se relacionan las capas y geometrías** | Mapa MapLibre de trabajo, OSM/IGN, fuentes WMS/WFS IDESA, centroides Georef, importación GeoJSON, validación de fuentes, recorte topológico por BBOX, controles de procedencia y exportación de capas |

El mismo motor cartográfico `GeoMap` puede utilizarse en **modo compacto de lectura** como vista auxiliar, pero sus herramientas de consulta, edición de capas y exportación solo aparecen en Mapas y SIG. Es reutilización técnica de un mapa, **no duplicación de sus flujos de trabajo**.

El editor `StudyAreasWorkbench.tsx` fue extraído del monolito `GeoMap.tsx` y vive **solo en Área de estudio**. Su procedencia y sus superficies siguen calculadas por `study-areas.mjs` y se almacenan únicamente en el navegador. En GIS las zonas aparecen **como capas de solo lectura**, listas para superponer con otras fuentes.

## Flujo del caso Diablillos QA

1. En Área de estudio, declarar la ventana de consulta mediante latitud, longitud y distancia nominal. La BBOX nunca se presenta como perímetro real del proyecto.
2. Elegir explícitamente un polígono sintético irregular con hueco y distribuirlo en cuatro zonas A–D, o traer un único polígono local previamente importado desde SIG.
3. Revisar superficie aproximada en hectáreas y distribución total de las zonas; descargar polígono/subáreas como GeoJSON de ensayo.
4. Ir a Mapas y SIG para comparar esas zonas con referencias cartográficas, importar fuentes, validar topología, recortar el archivo local por la AOI o exportarlo.
5. Regresar a Área de estudio: el mismo polígono y las mismas zonas siguen visibles. Las asociaciones documentales con PGA, Impactos, Monitoreo y Evidencias siguen vinculadas por el mismo escenario.
6. Si la fuente original importada se elimina o cambia la ventana, las zonas obsoletas no deben mostrarse ni usarse para inferencias de documentación.

## Garantías

- `#/area` **no incluye** el importador GeoJSON, el gateway WFS, los controles WMS, la descarga de recortes SIG ni las herramientas de procesamiento de capas.
- `#/mapas` **no incluye** formularios de coordenadas AOI, el editor de subáreas, la ficha territorial ni la creación de un polígono de estudio.
- El usuario puede cambiar de módulo por enlaces explícitos, conservando los datos locales compartidos (`ambienta-aoi-*-v3`, `ambienta-study-areas-*-v1`, `ambienta-gis-*-working-v3`).
- El expediente V1/V2 no se reescribe, y el backend Supabase Edge `ambienta-sig-v31` no se modifica.
- Los usos funcionales A–D, hectáreas aproximadas y vínculos de los 16 registros de Diablillos siguen rotulados como **SIMULADOS, NO OFICIALES**. El área minera real, la extensión de un impacto y las zonas de influencia requieren fuente georreferenciada respaldada.

## QA y regresiones

Se añadió `v3/overrides/scripts/area-gis-separation-smoke.mjs` para comprobar:
- rutas con funciones exclusivas y ausencia de paneles redundantes;
- zona creada en Área de estudio visible en el mapa SIG y viceversa;
- persistencia tras recargar sin perder datos;
- invalidación inmediata de zonas al modificar BBOX;
- importación SIG y retorno a Área para asignación sobre polígono fuente, sin modificar originales;
- regresión de recorte cóncavo, huecos, IDESA/Georef, relaciones documentales e integridad V1/V2.

Los ensayos automáticos `topology-smoke.mjs`, `study-areas-smoke.mjs`, `georef-real-smoke.mjs` y `sig-gateway-smoke.mjs` se adaptaron a la nueva navegación. Los datos de QA procedentes de fuentes oficiales deben mantener sus límites y restricciones; ninguna prueba convierte una BBOX en perímetro del proyecto.

Referencia: `.github/workflows/v3-preview.yml` y PR de esta rama. La publicación en GitHub Pages queda retenida hasta PASS de CI y navegador.
