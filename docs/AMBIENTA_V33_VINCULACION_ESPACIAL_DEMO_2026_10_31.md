# AMBIENTA V3.3 — vinculación espacial transversal en el caso Diablillos (DEMOSTRACIÓN)

**Estado:** módulo experimental V3 con registro local. Las asociaciones que se crean en esta etapa son **SIMULADAS, NO OFICIALES**, y no acreditan la ubicación de impactos, monitoreos o documentos.

## Arquitectura

- La página **Área de estudio** genera o importa un solo polígono de ensayo válido y lo divide topológicamente en cuatro subáreas A–D. La ventana BBOX sigue separada del perímetro y de la zonificación; no hay delimitación real aprobada de Diablillos.
- **Impactos**, **Plan de Gestión Ambiental**, **Monitoreo** y **Evidencias** incorporan un registro de asociaciones explícitas por ID de entidad y una o varias de las zonas A/B/C/D. Cada cambio se produce sobre una relación documental de prueba, **no** sobre la geometría ni los datos ambientales.
- **Área de estudio** y **Reportes** muestran cobertura por categoría y zona, junto con comprobaciones de coherencia documental.
- La carga opcional **«Cargar 16 vínculos simulados de prueba»** solamente existe para `DIAB-2026-DEMO`; vincula 4 impactos, 4 medidas PGA, 2 inspecciones y 6 evidencias en A–D, sin modificar ni crear esos registros. Es un escenario ficticio **explícito**, no una inferencia de fuentes.
- Si la medida asociada a un impacto, una inspección asociada a medida o una evidencia relacionada con medida/inspección están asignadas a zonas sin intersección, aparece una advertencia con los IDs que requieren revisión. **No se reclasifican automáticamente** y una coincidencia no prueba conformidad.

## Protección de fuente y consistencia

El dominio original del expediente (`web/domain.mjs`) permanece intacto. Las asociaciones viven exclusivamente en `localStorage` bajo `ambienta-zone-links-diablillos-v1`, separado de `ambienta-v2-diablillos-2026-demo` y de las capas originales. **No** se escribe a Supabase ni se consulta IDESA para este procedimiento.

El registro incluye `version`, `status: SIMULADO_NO_OFICIAL`, `projectId`, `scenarioFingerprint`, `createdAt`, `updatedAt` y `records.{impact,measure,inspection,evidence}`, con `zoneIds` y fecha por registro. El fingerprint incluye el SHA-256 de la fuente del polígono, instante de generación, versión y coordenadas BBOX. Si el escenario o proyecto cambia, se elimina un ID del dominio o aparecen asociaciones corruptas, **no se reutilizan** esos vínculos; el operador debe descartarlos expresamente.

El JSON de exportación conserva el hash y ámbito de procedencia del escenario, su BBOX, superficies de las cuatro zonas, revisión del expediente, IDs, relaciones y discrepancias. No incluye las geometrías originales ni los archivos privados de evidencia; tampoco está firmado digitalmente.

## Matriz de carga QA de Diablillos

| Zona simulada | Impacto | Medida PGA | Inspección | Evidencias |
|---|---|---|---|---|
| A · Operación | IMP-D-EFL | MED-DIAB-002 | INSP-DIAB-002 | EVID-D-004 |
| B · Monitoreo | IMP-D-AGU | MED-DIAB-001 | INSP-DIAB-001 | EVID-D-001 / 002 / 003 |
| C · Restauración | IMP-D-SUE | MED-DIAB-003 | — | EVID-D-005 |
| D · Resguardo | IMP-D-SOC | MED-DIAB-004 | — | EVID-D-006 |

La tabla no significa que haya efluentes medidos en A o impactos verificados en otras zonas. Es una **matriz de navegación y referencialidad**, no un diagnóstico.

## Pruebas automatizadas

- `tests/react-v3/spatial-links.test.mjs`: contratos de asignación multizona, 16 vínculos precargados, detección de discordancias, referencias inexistentes, validación de estado, origen y escenario, exportación y restauración local.
- `v3/overrides/scripts/spatial-links-smoke.mjs`: Chromium desde /area hacia /impactos → /pga → /monitoreo → /evidencias → /reportes, interacción con zonas y filtro, descarga JSON, persistencia tras recarga, dominio DEMO intacto e invalidación al cambiar BBOX.
- `.github/workflows/v3-preview.yml`: compila la aplicación, verifica que V1/V2 conservan sus hashes, ejecuta Node y navegador, sin consultar WFS oficial para crear asociaciones.

## Próxima etapa

Para una relación espacial **ambiental real** hará falta incorporar capas o instalaciones con coordenadas respaldadas, localizaciones de monitoreo, reglas de relación espacial (contiene/interseca/distancia/proximidad), esquema de permisos, evidencia documental y controles de calidad. La asignación manual puede ser útil para organizar un expediente, pero **no reemplaza una prueba de intersección topológica con geometrías verificadas**.
