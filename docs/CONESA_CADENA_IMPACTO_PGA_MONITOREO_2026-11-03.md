# AMBIENTA — Cadena Impacto → Conesa → PGA → Monitoreo
**03/11/2026 · continuidad después del PR #50**

## Objetivo
Completar el vínculo documental entre las cuatro piezas sin duplicar los
registros originales ni convertir los estados DEMO en resultados científicos.

## Fuente de autoridad y reglas
- `data.impacts[].id` es la identidad del impacto registrado. Se requiere
  elección explícita; no se usa coincidencia semántica ni por factor.
- `ambienta-conesa-simplificado-v1:<proyecto>` mantiene los criterios y
  cálculo del método original; no se modifican sus resultados.
- `ambienta-conesa-residual-v1:<proyecto>` conserva el escenario residual
  y admite opcionalmente `impactId` y `impactLinkReason`.
  Documentos anteriores siguen siendo válidos, sin migración destructiva.
- `data.measures[].impactIds` contiene los impactos declarados por la medida.
  La asociación se acepta si el impacto es único, la medida es única,
  pertenecen al mismo expediente y el ID aparece en `impactIds`.
- Si el impacto o la medida ya no existen o tienen ID duplicado, se
  conservan las referencias y la revisión queda pendiente.
- Si la medida pertenece a otro impacto, se marca `incompatible`.
  No se heredan inspecciones ni evidencias de una medida incompatible.
- `measureDocumentTrace` conserva la autoridad sobre inspecciones,
  evidencias, hallazgos y acciones. Se muestran los ID de inspección con
  acceso a `/monitoreo?inspeccion=<ID>`, exclusivamente de forma documental.
- Un ID correcto no demuestra correspondencia ambiental: se exige una
  **justificación redactada por el evaluador** para completar el vínculo
  impacto–interacción Conesa–medida.
- Si no existen inspecciones, se indica «sin inspecciones vinculadas».
  No se inventan visitas ni se considera incumplimiento por ausencia.
- Se conservan las exportaciones del método y se agregan al CSV del
  residual: impacto registrado, estado de cadena, inspecciones y evidencias
  explícitas y fundamento del vínculo.

## Semántica de estados
El estado «completo» indica integridad del formulario y correspondencia
de identificadores declarada. No confirma eficacia de medidas, calidad del
agua o aire, mitigación real, fiscalización en campo, cumplimiento de la
Ley 7070 ni aprobación del EsIA. La navegación sigue en el ámbito local
DEMO de AMBIENTA y no autoriza acceder a expedientes privados.

## QA
La prueba nativa usa el fixture Diablillos ficticio sin mutarlo:
- IMP-D-AGU → MED-DIAB-001 → INSP-DIAB-001 → EVID-D-001/2/3.
- IMP-D-EFL con MED-DIAB-001 genera incompatibilidad, sin heredar
  INSP-DIAB-001.
- El suelo/medida MED-DIAB-003 no tiene inspecciones; sí evidencia directa.
- IDs duplicados, faltantes, proyectos distintos y conflicto documental
  rechazan el vínculo inequívoco.
Playwright, con vistas 1366/1800, debe validar el selector, el fundamento,
las advertencias, el vínculo a monitoreo, las exportaciones CSV y la
persistencia, preservando V1/V2.
