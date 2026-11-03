# AMBIENTA — Anejo 4 de Conesa: catálogo bibliográfico de atmósfera (fichas 1–10)

**Fecha:** 2026-11-03. **Estado:** primer bloque documental, sin digitalización numérica ni valores CA automáticos.

## Fuente principal y trazabilidad

Vicente Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, tercera edición (1997), reimpresión 2000, **Anejo 4, I. Atmósfera, pp. impresas 254–258** (PDF del usuario, páginas 245–249 de 401).

Las diez fichas fueron cotejadas visualmente en el facsímil del usuario, no reconstruidas a partir de referencias secundarias. El registro solo incluye título, indicador, unidad consignada, localizador y observación visual aproximada del tipo de gráfica. **No contiene ninguna pareja (magnitud, CA), ajuste matemático ni validación técnica de curvas**.

| N.º | Ficha | Página impresa (PDF) | Indicador del libro | Unidad |
|---:|---|---|---|---|
| 1 | Monóxido de carbono (1) | 254 (245) | Concentración media diaria | p.p.m. |
| 2 | Monóxido de carbono (2) | 254 (245) | Nivel de inmisión ponderado por personas afectadas | p.p.m. |
| 3 | Hidrocarburos (1) | 255 (246) | Concentración media en 3 horas | p.p.m. |
| 4 | Hidrocarburos (2) | 255 (246) | Nivel de inmisión ponderado por personas afectadas | p.p.m. |
| 5 | Partículas sólidas | 256 (247) | Concentración media en 24 horas | mg/m³ |
| 6 | Oxidantes fotoquímicos | 256 (247) | Concentración media en 1 hora | p.p.m. |
| 7 | Óxidos de nitrógeno (1) | 257 (248) | Concentración media anual | p.p.m. |
| 8 | Óxidos de nitrógeno (2) | 257 (248) | Nivel de inmisión ponderado por personas afectadas | µg/m³ |
| 9 | Óxidos de azufre | 258 (249) | Concentración media en 24 horas | p.p.m. |
| 10 | Calidad del aire | 258 (249) | Índice ORAQI (OR) | Escala 10–100 |

Los indicadores/abreviaturas se transcriben en lenguaje legible a partir del escaneo; la grafía y los símbolos deben contrastarse con el original cuando se prepare una digitalización. La ficha 10 presenta un índice compuesto, no es intercambiable con un dato directo de concentración. La ficha 5 muestra una calidad máxima interior en su gráfica y **no** puede reemplazarse automáticamente por una recta decreciente.

## Implementación

- `ConesaAnnex4Catalog.ts`: diez identificadores estables, páginas impresas/PDF, indicador, unidad, observación visual y estado invariable `pendiente-de-digitalizacion`.
- `ConesaAnnex4Library.tsx`: consulta desplegable dentro del editor F3b, búsqueda por nombre/indicador/número y ficha individual con referencias.
- Una acción explícita **“Cargar únicamente cita y página en F3b”** completa solo `source` y `bookPage`; no cambia `points`, `assessor`, `scope`, `evidence`, `indicator`, `unit`, ni los escenarios SIN/CON.
- La persona evaluadora debe verificar la correspondencia de indicador, unidad, período de promediado, ámbito y pertinencia de la función. El cálculo sigue bloqueado por las comprobaciones F3b hasta documentar todos los campos y nudos.
- No se crea nuevo almacenamiento ni se modifican borradores F1, F2, F3a o F3b a menos que la persona pulse el botón de copia bibliográfica.

## Advertencia normativa

La metodología española es una fuente técnica, **no** un procedimiento aprobado automáticamente en Argentina. La Ley nacional 25.675, arts. 8 y 11–13, exige EIA previa para obras relevantes, y cada autoridad competente define requisitos del EsIA. Para su uso real hay que verificar reglamentaciones jurisdiccionales, calidad de las mediciones, normativa sectorial actual y parámetros locales.

Fuentes oficiales de contexto:
- Ley General del Ambiente 25.675: https://www.argentina.gob.ar/normativa/nacional/79980/texto
- *Guía para la elaboración de estudios de impacto ambiental* (Argentina): https://www.argentina.gob.ar/sites/default/files/2019/02/guia_elaboracion_eia-2.pdf

## Próximos bloques

1. Continuar el índice bibliográfico con el resto de Atmósfera y demás componentes del Anejo 4, cotejando cada página.
2. Diseñar protocolo de digitalización numérica por curva: ejes, ticks, validez, incertidumbre de lectura gráfica, transcripción independiente y acta de revisión, **sin derivar valores legales actuales del libro**.
3. Sólo después habilitar funciones reutilizables evaluables. Tratar discontinuidades/umbrales con una representación explícita distinta de la interpolación por nudos vigente.
4. F3c: reexaminar §5.3.3 e integrar importancia F1, depuración F2, UIP y valor del impacto por factor.

## Verificaciones

`tests/react-v3/conesa-anejo4-atmosfera-catalogo.test.mjs`: cardinalidad 10, números, páginas, nombres, indicadores/unidades, ausencia de puntos y filtros de búsqueda.

`v3/overrides/scripts/conesa-anejo4-atmosfera-smoke.mjs`: escritorio 1366/1800, 10 fichas, búsqueda, copia solo de la referencia/página, CA pendiente, localStorage F3a intacto, persistencia F3b y geometría.
