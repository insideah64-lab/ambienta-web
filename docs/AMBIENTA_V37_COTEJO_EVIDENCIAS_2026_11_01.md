# AMBIENTA V3.7 — Cotejo local de evidencia y vínculos documentales (experimental)
Fecha: 2026-11-01. Estado: PR #11 borrador, **NO publicado**; base: PR V3.6 #10, aún borrador.

## Objetivo
Completar la fase de integridad documental sin modificar el expediente de dominio, sus estados de medidas/inspecciones o los bytes de evidencia. Evitar el falso positivo «coordenada dentro de zona = monitoreo válido».

## Alcance implementado
1. Contrato puro `v3/overrides/src/features/maps/documentary-evidence.mjs`: toma una propuesta V3.6 de tipo **inspection** expresamente revisada para QA; una inspección identificada y existente en `data.inspections`; una evidencia existente en `data.evidence` ligada por `inspectionId` exacto y, cuando aplica, la misma `measureId`. Requiere que la huella SHA-256 declarada en la propuesta coincida con la referencia SHA-256 de la evidencia; solo entonces compara hash y tamaño del archivo aportado localmente. Bloquea IDs inexistentes, vínculos cruzados, huella/tamaño discordantes, archivos sin fingerprint, revisión espacial pendiente y procedencia SIG obsoleta.
2. Panel `ExistingEvidenceVerifier.tsx` en Mapas y SIG: selección explícita de propuesta/inspección/evidencia; archivo local máximo 10 MiB; cálculo SHA-256 mediante WebCrypto en memoria; mensaje de coincidencia o bloqueo; exportación opcional JSON del cotejo sin almacenar los bytes del archivo.
3. Overlay V3 de `EvidenceIntegrityLab.tsx`: al registrar una huella en Evidencias, permite seleccionar **opcionalmente** una inspección existente de la misma medida. Continúa usando `registerEvidence` y el dominio original, conserva el cálculo SHA-256 del laboratorio previo. No altera los archivos fuente de V1 o V2. Las evidencias antiguas sin inspección o huella no se convierten automáticamente ni se inventan respaldos.
4. Verifica la revisión de dominio y referencias en el momento del cotejo. Si cambian expediente, evidencia, informe de puntos o escenario, `matchesEvidenceContext` invalida el resultado local.

## Limitaciones deliberadas
- Sólo entidades DEMO: **no** existe autenticación verificada, firma digital, repositorio persistente de archivos originales ni cadena de custodia. «Coinciden los bytes» NO demuestra origen, calidad del muestreo, revisión profesional, medición real o cumplimiento.
- `monitoring` no tiene aún objeto independiente dentro del modelo original; no se fuerza a una inspección ni se crea un registro de medición ficticio. El vínculo V3.7 a entidades del dominio está limitado a inspecciones y sus evidencias.
- El valor SHA-256 declarado de un registro externo sólo se coteja contra un archivo local cuando el usuario lo selecciona expresamente. Nunca se da por verificado el SHA importado únicamente por su formato.
- Archivos de hasta 10 MiB se leen en memoria del navegador; no se transmiten, ni se guardan en el servidor por esta función. El JSON exportado sí contiene IDs y hashes y debe manejarse conforme a la política de datos del proyecto.

## QA
- Unit: `tests/react-v3/documentary-evidence.test.mjs` cubre asociación exacta, rechazo de fraude/mismatch, revisión humana, referencias obsoletas, hash y tamaño.
- Browser: `v3/overrides/scripts/documentary-evidence-smoke.mjs` registra un archivo sintético contra una inspección DEMO, crea una propuesta SIG, la revisa explícitamente, rechaza archivo distinto, verifica original y comprueba que los bytes y el estado del expediente no cambiaron tras el cotejo.
- `.github/workflows/v3-preview.yml`: corre el nuevo navegador además del suite V3 existente y preservación de V1/V2.
- Todos los puntos del caso Diablillos y mediciones de este laboratorio son **SINTÉTICOS**; no existen actas o visitas reales.

## GitHub
- [PR #11 apilado](https://github.com/insideah64-lab/ambienta-web/pull/11)
- Rama `feature/ambienta-v37-integridad-evidencias-2026-11-01`
- Primer checkpoint: `backup/ambienta-v37-integridad-checkpoint-2026-11-01`
- CI de referencia: consultar el último run de `v3-preview.yml` antes de aprobar cualquier fusión.

## Próximo trabajo
Crear un modelo nativo para registros de medición con unidades, resultados y límites de detección sin extrapolar desde las inspecciones; vinculación documentada en expediente real con identidad individual y custodia segura; validación de CRS, error espacial, permisos y licencias.
