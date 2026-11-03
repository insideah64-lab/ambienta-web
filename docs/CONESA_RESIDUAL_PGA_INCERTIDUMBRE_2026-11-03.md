# AMBIENTA — Escenarios iniciales/residuales, incertidumbre y referencia PGA (03/11/2026)

## Objeto y límites
Implementación incremental y experimental de Conesa simplificado para comparar
la valoración **inicial** y un **escenario residual** en la misma interacción.
No se suman puntajes entre impactos, no se convierten a porcentajes de
reducción y **no** se reemplaza el método Conesa histórico.
El escenario residual se introduce manualmente, criterio por criterio.

La implementación no certifica ni aprueba un estudio de impacto ambiental,
no confirma que la mitigación esté aplicada y no evalúa automáticamente
cumplimiento de legislación provincial.

## Referencias
- Ley 7070 de Salta, art. 44, entre otros: riesgos e incertidumbres,
  mitigación/remediación y seguimiento.
  https://www.argentina.gob.ar/normativa/provincial/ley-7070-123456789-0abc-defg-070-7000avorpyel/actualizacion
- Decreto 3097/2000, arts. 82 y ss.: análisis general ambiental/social
  costo-beneficio en horizontes temporales y metodologías subsidiarias.
  https://e-legis-ar.msal.gov.ar/leisref/public/showAct.php?id=13568
- Guía nacional para EsIA (edición 2023): jerarquía evitar, minimizar,
  restaurar, compensar; impacto residual; PGA y seguimiento adaptativo.
  https://www.argentina.gob.ar/node/136016
- IFC PS1 (2012), gestión de impactos, responsabilidades e indicadores:
  https://www.ifc.org/en/insights-reports/2012/ifc-performance-standard-1

Las fuentes respaldan el flujo de trabajo; no homologan la fórmula Conesa
como criterio suficiente para obtener una aprobación de EIA en Salta.

## Especificación
- Valuación inicial permanece en
  \`ambienta-conesa-simplificado-v1:<projectId>\`.
- Escenario residual aislado por expediente en
  \`ambienta-conesa-residual-v1:<projectId>\`.
- Documento \`ambienta.conesa-residual.v1\`, método
  \`conesa-simplificado-residual-v1\`.
- Se conservan signo, 10 criterios y dos modificadores de criticidad.
  Reversibilidad continúa únicamente con RV 1/2/4.
- El vínculo se fija a una huella reproducible (signo y todos los
  criterios iniciales en orden fijo). Si cambia el origen, el escenario
  exige revisión y ratificación explícita; no se actualiza silenciosamente.
- Registro por interacción: resultado \`persiste\` o \`evitado\`; jerarquía
  de mitigación; medida; evidencia; referencia documental PGA;
  responsable; indicador; frecuencia; incertidumbre;
  calidad de evidencia; estado declarado; supuestos.
- \`evitado\` nunca se transforma en I = 0 (cero no pertenece a la
  puntuación Conesa); para marcarlo se exige jerarquía \`evitar\`.
- Cambio numérico \`delta = abs(residual) - abs(inicial)\` únicamente
  con naturaleza igual y dos valoraciones completas. No constituye
  una cuantificación de eficacia ni un cambio porcentual.
- Estado \`completo\` solo informa integridad de los campos obligatorios.
  No certifica calidad externa, efectividad de la medida ni cumplimiento.
- El vínculo PGA es **una referencia manual**, aún no hay sincronización
  con el módulo de seguimiento PGA de AMBIENTA.
- Clasificación por etapas: se muestran conteos de interacciones,
  no sumatorias de puntajes ordinales.
- Se muestra información de registros desvinculados del catálogo y
  no se borran con las modificaciones del catálogo original.
- Exportaciones CSV con neutralización de prefijos de fórmula y JSON
  completos por expediente y método.
- El módulo comienza vacío para un expediente nuevo y **no** carga
  ejemplos ficticios al caso Diablillos.

## QA
Playwright en 1366 y 1800:
1. Abrir método no crea borradores.
2. Cargar solo dentro del contexto QA una valoración inicial de ejemplo.
3. Introducir una valoración residual diferente, sin alterar la inicial.
4. Exigir medida y documentación antes de declarar el escenario completo.
5. Conservar referencia documental PGA, incertidumbre e indicador en CSV.
6. Rechazar automáticamente la continuidad cuando cambian criterios iniciales.
7. Exigir ratificación explícita para actualizar el vínculo.
8. Mostrar "Evitado" sin puntuación numérica 0.
9. Verificar que no haya errores en la consola ni desbordes de la página.

**Estatus:** la validación depende del CI del PR asociado.
