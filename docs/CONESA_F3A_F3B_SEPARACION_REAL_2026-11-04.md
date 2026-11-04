# AMBIENTA · Separación efectiva entre Calidad ambiental y Curvas

Fecha: 2026-11-04.

## Problema detectado

Tras la implementación de las cuatro solapas, F3a («Calidad ambiental») y F3b («Curvas»)
mostraban prácticamente la misma pantalla: encabezado, resumen de cuatro indicadores,
gráfico de calidad SIN/CON, filas de factores y panel de cuatro resultados. Solo algunos
campos del editor variaban al elegir la solapa. Eso generaba una redundancia perceptible
que no tenía justificación metodológica.

## Corrección

### Solapa 3: Calidad ambiental (F3a)

- Presenta el inventario de **indicadores**, su unidad, la fuente, la situación SIN y CON
  proyecto y sus mediciones o estimaciones.
- Conserva **una única visualización de comparación de calidad ambiental SIN/CON** con
  valores verificables y su tabla de procedencia, derivada de la función *activa* en cada factor.
  Si la función activa es una curva F3b, sus CA calculadas se muestran aquí, y se informa la
  procedencia del método sin duplicar su editor.
- Ofrece edición de funciones lineales documentadas, exportación JSON F3a y CSV mixto
  F3a/F3b con diferencias de calidad.
- Los contadores significan factores, indicadores declarados, cálculos posibles y registros
  desvinculados preservados.

### Solapa 4: Curvas (F3b)

- Presenta un **inventario diferenciado de curvas** (activas, evaluables, pendientes y nudos),
  agrupando factores por nombre, indicador, origen documental y cantidad de puntos.
- Mantiene el editor de **función M → CA**, la gráfica de los nudos, su documentación,
  biblioteca Anejo 4, revisión experta y auditoría de digitalización doble.
- El resultado numérico de la interpolación se muestra como **comprobación breve**
  en lugar de repetir el gráfico y cuatro tarjetas de comparación de F3a.
- Ofrece exportación JSON específica de curvas. El gráfico comparativo SIN/CON
  no aparece aquí.

## Consistencia y límites

- Sigue existiendo **una sola instancia de `ConesaF3Panel`**, con F3a y F3b compartiendo
  indicador, unidad, escenarios y la selección de factor. El esquema y las claves de
  `localStorage` no se modifican y el selector de función por factor sigue siendo el mismo.
- No se crean ni presuponen curvas o medidas, ni se extrapola fuera del dominio de nudos.
  El CSV conserva el modo de transformación efectivo y su fuente.
- Los registros sin factor activo permanecen en JSON y se señalan también en F3b
  cuando existen curvas huérfanas.
- F3a y F3b son nombres internos de las etapas de AMBIENTA; la distinción visible es entre
  **escenarios de impacto y calidad**, por un lado, y **funciones de transformación**, por el otro.
- El sistema sigue siendo experimental y requiere revisión metodológica antes de usarlo
  como producto de una evaluación formal.

## Aceptación

- `matrix-method-catalog-smoke.mjs`: F3a contiene gráfico SIN/CON y su lista de indicadores;
  F3b tiene inventario de curvas, sin duplicar el gráfico.
- `conesa-libro-f3b-smoke.mjs`: edita y verifica una curva en F3b, vuelve a F3a para
  revisar la comparación, retorna a F3b sin perder nudos, y comprueba persistencia y exportación.
- Conservar todos los E2E F3a, F3b visual, auditoría, Anejo 4, F2, F1, además de pruebas
  numéricas y de integridad V1/V2. **HOLD hasta CI completo PASS**.
