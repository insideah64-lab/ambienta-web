# AMBIENTA — Hallazgos y acciones correctivas en expediente privado
**Continuidad del PR #55 · 03/11/2026**

## Auditoría del esquema (lectura, sin cambios)

En Supabase del proyecto ambiental se verificaron tablas
`public.audit_findings` y `public.corrective_actions`.
Ambas disponen de RLS SELECT/INSERT/UPDATE por titular de
`environmental_projects`; las escrituras también exigen
`created_by = auth.uid()`. Las claves foráneas compuestas impiden
vínculos entre expedientes diferentes:

- `audit_findings(project_id,inspection_id)` debe existir en
  `monitoring_inspections(project_id,id)`.
- `corrective_actions(project_id,finding_id)` debe existir en
  `audit_findings(project_id,id)`.
- Severidad de hallazgo: `observation | minor | major`.
- Estado de hallazgo: `open | investigating`.
- Estado de acción: `open | in_progress`.

La base consultada no tenía expedientes, hallazgos ni acciones
reales. **No se cambió el esquema, las políticas, la configuración ni
se escribieron filas en Supabase.**

## Implementación V3

En **Espacio privado → Expediente → Auditoría ambiental**:
1. **Nuevo hallazgo**: se elige una inspección del expediente con
   resultado declarado `observed` (no una inspección `pending`),
   título, descripción y severidad.
2. **Nueva acción correctiva**: se elige un hallazgo existente del
   expediente, se declara una acción concreta, responsable y fecha
   objetivo opcional.
3. Se usan métodos existentes de
   `createEnvironmentalRepository`:
   `createFinding` y `createCorrectiveAction`, que verifican
   sesión con `auth.getUser()`; RLS/FK decide autorización final.
4. INSERTs individuales devuelven un registro en estado `open`.
   No se generan cierres, verificaciones ni certificados.
5. Tras una inserción exitosa se recarga el expediente. Si esa
   consulta falla, se informa que **el registro ya fue creado**,
   evitando duplicaciones involuntarias.
6. Listas de hallazgos y acciones muestran estado real,
   identificadores de origen y enlaces solo por IDs.
   Se advierten referencias no resolubles, sin atribuciones por
   coincidencia de nombres.
7. El refresco de evidencias también queda protegido con el
   contador de sesión: una respuesta tardía no restablece datos
   de una cuenta cerrada en la pantalla.

## Precauciones
- Una inspección con estado `observed` sigue siendo una
  **declaración de quien la registró**, no una verificación de
  auditor externo.
- `open` indica que el registro está abierto, no que la
  deficiencia haya sido validada profesionalmente.
- El módulo **no** incorpora revisión independiente, firma,
  certificación, aprobación normativa ni cierre de hallazgos.
- No adjunta archivos, no habilita el piloto Storage privado
  ni crea URLs públicas.
- No importa valores de Diablillos DEMO ni matrices Conesa locales.
- No modifica las versiones V1/V2 ni las funciones del motor.
- Los tests de cliente y DOM sin sesión no sustituyen una
  prueba negativa en dos cuentas reales diferentes.

## Regresión y despliegue

Pruebas Node: validación de severidad, límite de campos y
fechas, inspecciones observadas frente a pendientes,
identificadores ajenos al proyecto, autoría, RLS simulado,
estados abiertos y proyección sin cruces entre expedientes.

Playwright: los visitantes sin sesión no ven los nuevos
formularios; los borradores de DEMO no se alteran. La suite
de V3 en GitHub debe conservar integridad V1/V2, matrices,
Conesa, reportes y capturas. No fusionar sin CI verde.

## Siguiente requisito operativo

Habilitar explícitamente las variables públicas de Supabase
en GitHub Actions y realizar prueba de acceso entre dos
cuentas reales sin datos sensibles. No insertar expedientes
ficticios en producción ni relajar políticas RLS para
pasar las pruebas. El flujo completo debe conservar
procedencia y documentación de autorización antes de
incorporar estados de cierre o aprobación profesional.
