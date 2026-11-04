# AMBIENTA — Leopold QA5: registro de revisiones y comparación de alternativas

Fecha: 2026-11-04. QA4, PR #73, fue fusionado y publicado (commit `dedf4510d65f73e85763349e78d0fdee983d2716`, Pages SUCCESS). QA5 se rebasó sobre ese `main` ya aprobado; la rama contiene solo sus cambios y no altera el esquema del expediente.

## Fundamento

Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental* (3.ª ed., 1997), §6.2.1.1 y cuadro 3 (pp. impresas 60–61), propone analizar las interacciones importantes, factores y acciones, así como comparar alternativas mediante estudio técnico. Ni la suma del producto didáctico ni los conteos justifican por sí solos aprobar, compensar o seleccionar una alternativa.

## Entregable A — Registro de revisión local

- Nuevo esquema separado `ambienta.leopold.review.v1`, clave `ambienta-leopold-review-v1:<projectId>`.
- Cada revisión requiere un responsable, una conclusión documental y un comentario argumentado; conserva fecha/hora **del navegador** y snapshot de la interacción (signo, M, I, fundamento, evidencia, nombres de acción/factor).
- Nuevas revisiones se **añaden**; se conserva el historial anterior en la interfaz, sin borrado automático. Se comprueba si la interacción original ha sido modificada o eliminada y se marca la revisión como desactualizada.
- Exportación JSON del registro. Validación estricta y bloqueo de escritura si hay un registro anterior corrupto: ofrecer descarga del contenido en bruto, **sin sobrescribirlo**.
- Advertencia explícita: historial **local, no autenticado ni criptográficamente inalterable**. No sirve como firma ni prueba certificada de auditoría. Un usuario que edita `localStorage` podría modificarlo.
- La matriz existente mantiene `ambienta.impact-matrix.v1`, su clave original, M/I/razones/evidencia y sus CSV/JSON. No se escriben notas en el expediente ni se mezclan con RIAM o Conesa.

## Entregable B — Comparación de alternativas

- Matriz A = proyecto abierto. Matriz B = JSON válido del esquema `ambienta.impact-matrix.v1`, cargado **solo en memoria** (sin escritura a `localStorage`, sin sustituir proyectos).
- Emparejamiento conservador por **nombre normalizado de factor + grupo**, y solo cuando no hay duplicidades en ninguno. Identidad nominal NO implica equivalencia ecológica; el especialista debe revisar el emparejamiento.
- Recuento por factor común: valoraciones completas (positivas/adversas), pendientes y no evaluadas. Se muestran las diferencias de cobertura y factores no comparables o ambiguos, sin rellenar vacíos.
- Prohibido inferir un `ganador`, una aprobación o una compensación a partir de conteos o productos M×I. No se compara severidad ni se afirma equivalencia de acciones, línea de base, unidades o escenarios.
- Exportación CSV de la vista descriptiva, escapando fórmulas en rótulos externos. No se exportan valores numéricos inventados.
- El estado de la alternativa B no se conserva tras recargar la página.

## QA de aceptación

1. `tests/react-v3/leopold-qa5-ledger.test.mjs` verifica validez del esquema, independencia del borrador, historial, autor, entrada duplicada, diferencia de proyecto y detección de valores desactualizados.
2. `tests/react-v3/leopold-qa5-alternatives.test.mjs` valida emparejamiento de nombre/grupo, exclusión de ambigüedades, conteos positivos/adversos, pendientes, valoraciones no declaradas e inmutabilidad de los objetos de origen.
3. `leopold-workbook-parity-smoke.mjs` amplía el E2E Chromium 1366/1800: selecciona celda, crea revisión, comprueba independencia de `localStorage`, modifica M y detecta revisión obsoleta; carga alternativa B, verifica factor común y ausencia de mutación; recarga y comprueba persistencia solo del registro.
4. Continuidad de todos los checks V3 y preservaciones V1/V2, además del ejercicio original de 50 interacciones.

**HOLD:** no publicar ni fusionar QA5 hasta CI completo PASS. PR #73 QA4 ya fusionado; QA5 se evalúa como PR #74 contra `main`, con CI propio obligatorio.

## Próximas mejoras no incluidas

Para auditoría técnica formal: firmas verificables, identidad/autorización en servidor, versionado persistente e inalterable, historial de cambios protegido por controles de acceso, co-revisión, bibliografía y actas. Para comparar alternativas de manera sólida: homologación experta de factores, fuentes y escenarios, misma línea de base y reglas explícitas por indicador; evitar comparación entre alternativas incompletas como si fueran equivalentes.
