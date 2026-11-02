# AMBIENTA — validación Leopold contra el tutorial y su planilla (02/11/2026)

## Material entregado por el usuario
- Video MP4 *Matriz de Leopold en Excel: ¡Aprende a llenarla desde cero!*.
- Libro `Matriz-de-Leopold.xlsx`, hoja `B`, ejemplo didáctico «Construcción de túneles menor o igual a 500 m (Categoría III)». Hoja A = plantilla en blanco.
- Se revisaron fotogramas del video y fórmulas/celdas del libro. La narración completa no se transcribió.
- Por autoría y pertinencia, no se añaden ni el MP4 ni el XLSX originales al repositorio: la prueba automatizada reconstruye solamente sus 50 pares de valores para comprobar el algoritmo.

## Referencia de cálculo con Excel
Cinco acciones: estudios de factibilidad, perforaciones, revestimiento, movilidad y mantenimiento. Diez factores: agua, aire, erosión, taludes, microflora, animales terrestres, paisaje, condiciones físicas únicas, empleo y red de transporte. Cada interacción posee **magnitud con signo** y **valor de importancia independiente**, 1–10.

- Recuento: **50 evaluadas, 18 positivas, 32 negativas**.
- Suma de productos (magnitud × importancia), ordenada por factor:
  `[-29,-52,-10,-6,-13,-20,-1,-17,99,53]`.
- Suma de productos por acción:
  `[0,-42,8,60,-22]`.
- Suma algebraica = **+4**.
- Ejemplo factor agua = (−1×2) + (−5×1) + (−7×2) + (−2×1) + (−3×2) = **−29**.
- Ejemplo factor empleo = (4×1) + (5×5) + (5×5) + (7×6) + (3×1) = **+99**.

Los totales se reprodujeron a partir de los valores originales de la hoja B mediante una lectura independiente de la plantilla. **Son aritmética de un ejercicio didáctico, NO valoraciones de Diablillos.** La suma +4 no implica viabilidad ni que beneficios económicos neutralicen daños ambientales.

## Cambios a AMBIENTA
- `LeopoldAnalytics.ts`: motor puro para conteos y sumas con signo por fila, columna y global, **sin peso UIP**.
- `LeopoldSummaryPanel.tsx`: resultados detallados por factor y acción, recuentos positivos, negativos, celdas incompletas y no evaluadas, descarga CSV.
- Vista opcional de **celdas diagonales** en el editor de Leopold; magnitud con signo arriba, importancia abajo. Identificación y ponderación exploratoria mantienen sus representaciones.
- El almacenamiento `ambienta-impact-matrix-v1:<id>` se conserva sin migración ni cambio de esquema. Se mantiene la distinción entre *sin interacción*, *no evaluada* y *valoración pendiente*.
- Las cifras se calculan **solamente** a partir de valoraciones completas (magnitud e importancia 1–10); no se interpreta ausencia de datos como magnitud cero.

## Seguridad metodológica
La matriz Leopold es una técnica de identificación y valoración por expertos, no una fórmula de aprobación o compensación de efectos. Los agregados con signo son resúmenes descriptivos. No se aplican categorías ni umbrales de clasificación provenientes de la hoja didáctica porque no está demostrada su validez general o normativa. El método de Conesa y RIAM permanecen separados.

## Casos QA de la nueva suite
- Reproducir los **50 pares** del XLSX de ejercicio en el estado del navegador; verificar 10 sumas por factor, 5 sumas por acción, 18/32 recuentos y saldo +4.
- Vista diagonal: primer caso muestra −1 y 2 por separado.
- Exportación de CSV de resumen y validación de los valores.
- Desmarcar la importancia de una celda: **49 completas, 1 pendiente**, suma pasa de +4 a +6 por excluir un producto de −2; se distingue de impacto ausente.
- Dos resoluciones escritorio (1366 y 1800 px), sin errores JS ni desbordamientos.
- Regresiones originales de proyectos DEMO, lectura sin mutación, cartografía/SIG, Conesa/RIAM, informes y V1/V2.
