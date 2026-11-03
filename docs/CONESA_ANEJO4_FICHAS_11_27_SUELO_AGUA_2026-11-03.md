# AMBIENTA — Conesa 1997 · Anejo 4 (pp. 259–267): expansión de 17 fichas

**Fecha:** 2026-11-03. **Fuente primaria:** Vicente Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, tercera edición 1997, reimpresión 2000, Anejo 4. Cotejo visual directo con el PDF del usuario, **páginas de archivo 250–258** (correspondientes a páginas impresas 259–267).

## Índice documentado

El catálogo pasa de diez a **27 fichas bibliográficas**, sin valores CA(M) digitalizados. Son un subconjunto del Anejo 4; **no representan 27 funciones numéricas aprobadas** ni cobertura completa de la guía.

| Sección / ficha | Título del libro | Página impresa | PDF |
|---|---|---:|---:|
| I. Atmósfera 11 | Ruido (1) | 259 | 250 |
| I. Atmósfera 12 | Ruido (2) | 259 | 250 |
| I. Atmósfera 13 | Sonido | 260 | 251 |
| I. Atmósfera 14 | Olor y visibilidad | 260 | 251 |
| II. Suelo 1 | Erosión del suelo (1) | 261 | 252 |
| II. Suelo 2 | Erosión del suelo (2) | 261 | 252 |
| II. Suelo 3 | Erosión del suelo (3) | 262 | 253 |
| II. Suelo 4 | Estructuras de las parcelas | 262 | 253 |
| II. Suelo 5 | Márgenes arbolados y geológicos | 263 | 254 |
| III. Agua 1 | Características fluviales | 264 | 255 |
| III. Agua 2 | Pérdida de agua en las cuencas hidrológicas | 264 | 255 |
| III. Agua 3 | Oxígeno fluido | 265 | 256 |
| III. Agua 4 | Olor y materiales flotantes | 265 | 256 |
| III. Agua 5 | Plaguicidas en el agua | 266 | 257 |
| III. Agua 6 | Temperatura | 266 | 257 |
| III. Agua 7 | Sustancias tóxicas (excepto plaguicidas) | 267 | 258 |
| III. Agua 8 | Demanda biológica de oxígeno | 267 | 258 |

El libro presenta distintas **familias de representación**, que se registran en metadatos descriptivos: función continua, varias series/condiciones, valores cualitativos/categóricos y discontinuidad/umbral. Son lecturas visuales aproximadas de las figuras, **no una clasificación normativa o matemática certificada**.

Ejemplos especialmente delicados:
- Ruido (1) muestra curvas distintas según frecuencia y extensión de la exposición; no hay una única curva aplicable.
- Sonido y olor se apoyan en categorías; no deben transformarse automáticamente en una magnitud continua.
- Agua: oxígeno disuelto incluye en el dibujo una saturación señalada por el libro (9 mg/l), que **no representa un límite universal ni actual**.
- Temperatura presenta un máximo próximo al equilibrio natural y un trazado alternativo; no basta una recta simple.
- Sustancias tóxicas (excepto plaguicidas) contiene un salto, que la interpolación lineal del motor F3b **no admite**.
- Demanda biológica de oxígeno contiene trayectorias diferentes según el tipo de medio acuático.
- Plaguicidas usa una relación con una concentración permisible; **no trasladar valores permisibles de 1997 a la legislación argentina actual**.

## Implementación no destructiva

- `ConesaAnnex4Catalog.ts`: se incorporaron `II. Suelo` (5) y `III. Agua` (8) y se completó `I. Atmósfera` (14); todos tienen ID estable, número por sección, localizador de página, indicador, unidad y forma visual.
- `ConesaAnnex4Library.tsx`: filtros por sección, búsqueda y tarjetas bibliográficas. Una vista cuantifica **solo la distribución dentro de estas 27 fichas cotejadas** (14/5/8), con valores explícitos como texto. No confundir con cobertura porcentual del Anejo completo ni con resultados de calidad ambiental.
- La acción existente `Cargar únicamente cita y página en F3b` conserva intactos indicador, unidad, escenarios, fuente de mediciones, nudos, responsable y evidencia.
- Nuevo bloqueo: si ya existe cualquier nudo con magnitud o CA, no se puede **reemplazar esa cita** desde el catálogo. Esto evita atribuir sin revisión los datos digitalizados a otra figura. La consulta de fichas sigue disponible.
- El motor F3b no recibe puntos numéricos desde el catálogo, ni se elige automáticamente una curva. Gráficos con múltiples series, categorías o discontinuidades muestran advertencia contextual.
- No se altera el almacenamiento de F1/F2/F3a/F3b fuera de acciones explícitas ni se importan datos externos.

## Protocolo de digitalización que falta construir

Referencia pública técnica de **WebPlotDigitizer**: https://www.automeris.io/docs/digitize/ — para gráficos XY hay que calibrar pares de puntos conocidos en ambos ejes y distinguir escalas lineales/logarítmicas. Esa referencia describe una **técnica de extracción**, no garantiza calidad de las gráficas de Conesa por sí misma.

Propuesta de futuros controles antes de habilitar curvas reproducibles:

1. Registrar el ejemplar, edición, ficha, página impresa y de archivo, recorte fuente, y tipo de escala (lineal/categórica/discontinua).
2. Capturar y guardar pares de calibración de X e Y, unidad, resolución del recorte y precisión estimada de lectura gráfica.
3. Reconstrucción independiente por dos revisores y diferencias en M/CA, más discusión de discrepancias y tolerancias justificadas por resolución (sin presuponer límites estadísticos universales).
4. Validar extremos y trazado original, y detectar saltos/múltiples series antes de intentar interpolación.
5. Exigir acta profesional de adecuación al lugar de estudio, indicador concreto y normas vigentes.
6. Vincular un catálogo de curvas **revisadas** con versión y procedencia, sin sustituir las curvas existentes en proyectos de usuarios.

La guía argentina de EsIA edición 2023 fue aprobada por Resolución 23/2023: https://www.argentina.gob.ar/node/136016 . Referente nacional actual de práctica, pero no adopta automáticamente todas las funciones del libro de Conesa.

**HOLD:** hasta ejecutar controles técnicos, ninguna de las 27 fichas puede interpretarse como una curva numérica validada. F3c (importancia, UIP, Vj/IAj) continúa pendiente.

## QA

`tests/react-v3/conesa-anejo4-atmosfera-catalogo.test.mjs`: conserva la revisión original de 10; comprueba ahora las 27 referencias, índices, páginas, estados y búsquedas por sección y siglas DBO.

`v3/overrides/scripts/conesa-anejo4-atmosfera-smoke.mjs`: Chrome 1366/1800px, filtros por sección, advertencia de figura discontinua, copia bibliográfica limitada, ausencia de curva calculable, bloqueo de reatribución de nudos, preservación del borrador F3a.

**No fusionar ni publicar sin CI completo aprobado.**
