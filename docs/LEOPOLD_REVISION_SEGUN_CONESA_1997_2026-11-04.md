# AMBIENTA · Auditoría de Leopold contrastada con Conesa (1997)

**Fecha:** 2026-11-04. **Fuente primaria del usuario:** Vicente Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, 3.ª edición (1997), reimpresión 2000, **pp. impresas 60–61**, cuadro 3 («Matriz clásica de Leopold») y apartado 6.2.1.1 («Matrices causa-efecto»), **páginas 55–56 del PDF cotejado**.

## Requisitos que el texto realmente describe

- Leopold es una matriz **preliminar de identificación y comparación**, con **columnas de acciones** y **filas de factores**.
- La matriz clásica contiene un inventario posible de **100 acciones × 88 factores = 8.800 interacciones potenciales**; en la práctica se identifican las relevantes y puede elaborarse una matriz reducida. Un catálogo reducido/parametrizable es una **adaptación del instrumento**, no la reproducción completa del inventario.
- En cada interacción posible se dibuja una **diagonal**; en la parte superior izquierda se escribe **magnitud con signo (+ o −), de 1 a 10**; en la parte inferior derecha, **importancia, de 1 a 10**. El cero **no es válido** dentro de las dos escalas para impactos que se califican.
- La explicación de Conesa describe magnitud como extensión de la alteración e importancia como incidencia/trascendencia de ese efecto, con un ejemplo local/regional en las instrucciones de la figura. No son dos nombres de la misma variable.
- Se estudian las **sumas por factores** (fragilidad/incidencia) y **por acciones** (agresividad relativa), acompañadas de una discusión de impactos significativos: filas/columnas destacadas y celdas aisladas con puntuaciones elevadas. Debe **evitarse duplicar interacciones** con nombres distintos.
- **Límite de interpretación:** el pasaje consultado no fija una regla universal de multiplicar M×I ni umbrales normativos de aprobación. El producto/sumatorio implementado en AMBIENTA proviene de una **planilla didáctica adicional** («Matriz-de-Leopold.xlsx», hoja B, ejemplo de túneles), **no de esa indicación del libro**. Tampoco convierte a Leopold en el motor de importancia de Conesa ni en el método de UIP del libro.

## Diagnóstico del código antes de esta corrección

| Aspecto | Situación observada | Dictamen |
|---|---|---|
| Filas/columnas, signo, M e I independientes | Implementados, escalas 1–10 | Compatible |
| Diferencia entre sin evaluar / sin interacción / pendiente | Conservada en React y `LeopoldAnalytics.ts` | Compatible |
| Celdas diagonales | Disponibles mediante selector visual (opcionales) | Compatible como vista, no como reproducción obligatoria |
| 100×88 frente a catálogo reducido | Catálogo inicial 4×7, ampliable; no pretende tener el inventario original | **Rotular explícitamente como adaptación reducida** |
| Productos M×I | Reproducen un XLSX de túneles; UI mostraba suma global | **Aclarar que es auxiliar/didáctico, no fórmula universal de Conesa** |
| Filtro de factores | Cambiaba subtotales por acción, pero no los de factor ni el resumen global | **Defecto de coherencia visual corregido** |
| Positivos y negativos | Se mostraban recuentos pero solo suma algebraica, que podía ocultar impactos adversos | **Separación de acumulados sin compensación incorporada** |
| Duplicación de acciones/factores | No se advertían coincidencias de nombres | **Nueva advertencia de revisión; no eliminación automática** |
| Fundamento/cita y edición | Se conservan; campos técnicos libres y CSV/JSON existentes | Preservado |

## Correcciones no destructivas

1. `LeopoldSummaryPanel.tsx`: ambas tablas y los valores totales se calculan sobre **el conjunto completo del expediente**, aunque el filtro visual oculte factores. Filtrar ya no altera ningún subtotal por acción. CSV y pantalla se corresponden.
2. `LeopoldAnalytics.ts`: se calculan por separado **Σ de productos beneficiosos** y **Σ del valor absoluto de productos adversos**, además de la suma algebraica auxiliar original. No se sustituyen las valoraciones M/I de cada celda. El saldo firmado sigue visible para reproducir el ejercicio del usuario, pero no es un saldo ambiental favorable.
3. `LeopoldAnalytics.ts`: detección conservadora de **nombres repetidos** (sin distinción de mayúsculas, tildes o espacios repetidos). Solo alerta al evaluador; no inventa impactos, no deduplica celdas ni afirma que dos rótulos iguales describan necesariamente la misma interacción.
4. `ImpactMatrixBuilder.tsx`: se explicita qué significan magnitud/importancia, por qué la diagonal representa a Leopold clásico, el carácter auxiliar de la multiplicación y la naturaleza ilustrativa del catálogo reducido.
5. Se conserva íntegramente el **esquema de persistencia `ambienta.impact-matrix.v1`**, claves de almacenamiento, IDs, campos y valoraciones existentes. La ponderación exploratoria y Conesa/RIAM permanecen separados. Ningún cambio reescribe las evaluaciones.

## QA y pendientes para una versión profesional

- **Libro:** pp. 60–61 verificadas en el PDF aportado. No asignar a Conesa cálculos que corresponden a la planilla didáctica.
- **Pruebas numéricas:** `tests/react-v3/leopold-conesa-audit.test.mjs` comprueba signos, productos por separado, pendientes, ausencias y colisiones de rótulos.
- **Prueba de navegador:** `leopold-workbook-parity-smoke.mjs` conserva los 50 pares de valoraciones de la planilla y los contrastes previos (18 positivos, 32 negativos, suma +4), añade verificación de desagregados, filtro visual que no modifica los subtotales y advertencia por duplicados, en resoluciones 1366 y 1800 px.
- **Pendiente:** detección semántica de *efectos duplicados aunque usen distintos nombres* (requiere juicio humano), propuesta de matriz reducida con decisión humana, documentación de criterios de expertos, identificación de impactos aislados significativos y **comparación de alternativas sin interpretar una suma de productos como índice legal o ecológico**.
- **No se incorpora automáticamente el listado clásico de 100 acciones/88 factores**: requiere cotejo completo del inventario con fuente y un modo de importación aprobado, no multiplicar 8.800 celdas vacías de forma ficticia.

**Condición:** no fusionar ni publicar hasta que GitHub Actions complete la batería de integridad y navegador.
