# AMBIENTA V3.8 — Registro de mediciones ambientales (experimental)
Fecha: 2026-11-01. Estado: **PR #12 borrador**, apilado sobre V3.7 y V3.6. **No publicado**.

## Alcance y separación de responsabilidades
V3.8 introduce un registro de mediciones **independiente** de inspecciones, impactos, medidas PGA, análisis SIG y evidencias. Es una superposición aislada de React V3, sin tocar `web/domain.mjs`, las entidades de V1/V2, ni la compilación pública estable.

### Modelo de medición, revisión y procedencia
Cada entrada se declara manualmente, sin valores precargados. Incluye:
- ID interno único `MUE-0001`..., ID de muestra y estación declarada.
- Medida del PGA existente; opcionalmente inspección y evidencia por ID real del dominio, con comprobación de medida e inspección asociadas. La estación es una etiqueta **no georreferenciada por sí sola**.
- Matriz (agua, suelo, aire, ruido, biota u otra), parámetro/análito, unidad seleccionada, método declarado.
- Tres modalidades mutuamente excluyentes: `quantified` con valor numérico; `below_detection` sin valor numérico con LDM positivo; `below_quantification` sin valor numérico con LCM positivo. **Una lectura censurada nunca se representa como cero**.
- LDM y LCM opcionales salvo modalidad censurada, incertidumbre absoluta opcional, sin inferir umbral ni cumplimiento; se exige LDM ≤ LCM cuando ambos están presentes.
- Fecha/hora de toma, fecha/hora opcional de análisis posterior, identificación de informe y responsable de carga **declarados**.
- El vínculo a una referencia de evidencia con SHA-256 se considera **huella declarada, no un cotejo de bytes**. El cotejo real existente de V3.7 es un flujo separado.

### Persistencia y auditoría
`v3/overrides/src/features/monitoring/measurements.mjs` define un registro local `ambienta-measurements-local-v1`, inicialmente vacío y limitado a 300 entradas. Se guarda en localStorage por caso de ensayo. Cada creación genera un evento, incrementa revisión y conserva copia del dato ingresado. Anulación posterior requiere nombre de responsable y justificación; el registro original permanece, con evento de anulación.
La lectura valida esquema, identidad del proyecto, unidades, intervalos, calificadores, fechas, unicidad, integridad del historial y referencias actuales del expediente. Si falla, bloquea nuevas escrituras y **no reemplaza** los bytes guardados. Para evitar sobreescritura de otra pestaña se vuelve a leer y comparar antes de persistir. La exportación descarga entradas, procedencia, revisiones e historial en JSON.

`MeasurementWorkbench.tsx` incorpora el formulario, historial, anulación y exportación en **Monitoreo**, junto a las inspecciones existentes, sin sustituirlas. No existe conversión automática de unidades ni comparación con límites de vertido, calidad ambiental o legislación.

### Pruebas y criterios de éxito
- `tests/react-v3/measurements.test.mjs`: valores cuantificados, lectura censurada, unidades, pH, temperaturas, fechas, límite de detección/cuantiﬁcación, relaciones documentales, duplicados, anulación y protección de archivos locales corruptos.
- `v3/overrides/scripts/measurements-smoke.mjs`: Chromium; registro vacío al inicio, carga manual cuantificada con inspección/evidencia, segunda lectura censurada, persistencia, exportación, anulación con causa, manipulación local bloqueada y comprobación de que el expediente original **no cambió**.
- `.github/workflows/v3-preview.yml`: mantiene controles previos de V1/V2, SHA originales, React V3 y todos los ensayos Chromium.
- Datos usados en QA son **SINTÉTICOS** y no representan calidad del agua, aire ni suelo del caso Diablillos.

### Límites profesionales y próximos pasos
Esta versión no verifica que la muestra haya sido tomada, ni autentica al laboratorio, firmas, ubicación de estación, unidades con certificado metrológico, incertidumbre expandida, límites de cuantificación reales, cadena de custodia, identidad ni permisos del usuario. No se pueden emitir diagnósticos de conformidad con la normativa. La etiqueta de estación no es un punto SIG hasta vincular explícitamente su procedencia en una versión posterior.
La futura integración con expediente real requiere almacenamiento seguro con autenticación y permisos, control de cambios y fuente documentada, esquema de muestras/analitos e incertidumbre, validación jurisdiccional, pruebas de seguridad y revisión profesional.

## Ramas
- Base V3.7: `feature/ambienta-v37-integridad-evidencias-2026-11-01`
- Trabajo V3.8: `feature/ambienta-v38-mediciones-2026-11-01`
- [PR V3.8 #12](https://github.com/insideah64-lab/ambienta-web/pull/12)
- Checkpoint preliminar: `backup/ambienta-v38-mediciones-checkpoint-2026-11-01`
- Mantener V3.5 como web pública estable hasta ratificación.
