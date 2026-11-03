# AMBIENTA — enlace de Conesa residual al PGA por ID (03/11/2026)

## Problema que resuelve
Conesa simplificado permite documentar medidas propuestas y referencias
PGA en texto libre, pero no vincula esos registros con las medidas que
ya existen en el dominio del expediente. Se implementa una asociación
**explícita, de solo lectura**, usando el mismo identificador de proyecto.

## Arquitectura y autoridad
- El dominio original de PGA conserva la autoridad sobre `measures`,
  `programs`, `inspections` y `evidence` del estado `DemoState`.
- El escenario residual conserva su propio archivo
  `ambienta-conesa-residual-v1:<projectId>`, sin mover ni copiar medidas.
- Un campo opcional `measure.pgaMeasureId` guarda únicamente el ID explícito
  de medida ya existente. Las referencias de texto libre `pgaRef` siguen
  disponibles y no se reinterpretan ni se migran.
- Un selector solo ofrece medidas con ID único del proyecto activo.
- IDs desconocidos, duplicados y expediente de otro proyecto quedan sin
  resolución. Una referencia inválida se conserva y exige revisión;
  no se reasigna por nombre ni por orden de array.
- El detalle muestra título, programa, responsable, estado documental,
  cantidad de inspecciones y evidencias vinculadas según
  `measureDocumentTrace`, con sus advertencias de trazabilidad.
- Se enlaza a `/pga?medida=<ID>` para abrir la ficha del mismo registro.
- El estado de la evaluación residual pasa a `Revisar` ante un vínculo PGA
  explícito que no resuelve o un conflicto documental. No se asigna puntaje
  Conesa ni se modifica la naturaleza del impacto.
- CSV incluye los IDs originales, estado del enlace, programa, estado
  documental, cantidades de registros y advertencias.

## Restricciones
- No se crea ni modifica una medida PGA desde el constructor de matrices.
- El vínculo entre una medida y un escenario Conesa es una **declaración
  explícita del evaluador**; no valida automáticamente que la medida sea
  pertinente para esa interacción ni que haya mitigado el impacto.
- Los recuentos corresponden a vínculos documentales, no a conformidad
  ambiental. «Verificada» sigue siendo un estado del expediente DEMO.
- Diablillos permanece identificado como estudio documental de demostración,
  sin visitas de campo ni evidencia acreditada.
- Si el usuario elimina una medida original, el ID guardado no se borra;
  se muestra como referencia no encontrada.
- Se retiene la compatibilidad con borradores residuales previos, que
  no contienen `pgaMeasureId` y continúan abiertos sin vínculo.
- No se presume compatibilidad con expedientes Supabase; el módulo
  permanece ligado al estado local autenticado por `readDemoState`.

## Referencia técnica
La suscripción entre un estado React y una fuente externa debe hacerse
con un flujo explícito; en esta versión el PGA llega por props desde
`App`, por lo que los cambios del dominio provocan un nuevo render.
React: https://react.dev/reference/react/useSyncExternalStore

## Pruebas
- Native Node: resolución por ID, conflictos y duplicados, proyectos
  distintos, inmutabilidad de fuente y conservación de advertencias.
- Playwright escritorio: vincular una medida real del estado DEMO por
  ID, observar trazabilidad, navegar a PGA, descargar CSV y verificar
  que un ID luego desaparecido queda para revisión.
- Suite V3 completa, integridad V1/V2 y prueba de Conesa original
  deben permanecer verdes antes de integrar.
