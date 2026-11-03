# AMBIENTA — Medidas PGA vinculadas en expedientes privados
**Etapa: 03/11/2026 · sucesora del PR #53**

## Fuente real y arquitectura
Se comprobó en el proyecto Supabase de AMBIENTA (lectura de catálogo y
definición, sin ejecutar escrituras) que ya existe
`public.create_measure_with_impact`:

- Parámetros: `p_project_id`, `p_program_id`, `p_impact_id`, título,
  descripción, responsable, indicador, criterio, frecuencia y fecha límite.
- La función devuelve un UUID y está declarada con
  **`SECURITY INVOKER`** (`prosecdef=false`).
- Comprueba `auth.uid()` y escribe medida más vínculo en la misma
  transacción de PostgreSQL. Si falla la segunda inserción, la primera
  inserción de esa función se revierte.
- Las claves foráneas de `management_measures` y
  `measure_impact_links` son compuestas con `project_id`:
  no pueden apuntar a programas o impactos de otro expediente.
- Las políticas RLS de ambas tablas exigen la propiedad del expediente
  mediante `environmental_projects.owner_id = auth.uid()`.
- No se creó ninguna tabla, función, política ni registro de producción
  durante esta entrega.

## Funcionalidad V3
En **Espacio privado → expediente autenticado**:
1. Se identifican los impactos y programas registrados.
2. «Nueva medida vinculada» abre el formulario.
3. El usuario elige explícitamente el ID de programa y de impacto
   disponibles en **ese expediente**.
4. Describe la medida, su responsable, el indicador, criterio,
   frecuencia y fecha límite opcional. Los campos se validan antes
   del llamado a la base.
5. El cliente invoca el repositorio existente
   `createEnvironmentalRepository.createMeasure`, que usa
   `rpc('create_measure_with_impact', ...)` y `auth.getUser()`.
6. Se registra en modo borrador, sin inspecciones ni evidencias ficticias.
7. La vista recarga `management_measures` y
   `measure_impact_links` por proyecto. Muestra relaciones por ID y
   advierte sobre referencias que ya no se puedan resolver.

Si se crea correctamente pero falla la lectura posterior, se conserva
la confirmación de alta y se indica que no debe repetirse el INSERT
para evitar duplicados. El usuario no puede crear medidas cuando aún
no existen impactos o programas, ni seleccionar UUID de otros proyectos
desde el formulario.

## Restricciones y autoridad
- **Ningún cambio** en la demo ni en los borradores locales de Conesa:
  sus IDs didácticos NO se convierten en UUIDs de Supabase.
- RLS y FKs son autoridad del servidor. Las verificaciones del
  formulario mejoran la experiencia, pero no sustituyen políticas.
- Una medida creada no equivale a medida implantada ni a programa aprobado.
- No se habilitan evidencias de archivo, roles de revisor,
  firma, auditoría de campo, ni importación automática de matrices.
- Las variables públicas de build de Supabase siguen siendo
  optativas y no se utiliza ni almacena una clave `service_role`.

## QA propuesto
- Tests Node: texto y fecha, UUID y pertenencia al expediente,
  ejecución de una sola RPC, no hay INSERTs separados,
  rechazo de sesión anónima / error de RLS, no autovalidación
  de eficacia, referencias rotas y registros de otro expediente.
- Test Playwright de visitante: formulario no disponible sin sesión;
  no se modifica ningún borrador local.
- Compilación y pruebas de la suite V3, integridad V1/V2.
- Falta aún la prueba real E2E con dos cuentas, especialmente para
  autorización cruzada; el mock no la reemplaza.

## Próximos pasos
Antes de habilitar expedientes con revisión profesional, construir
rol de revisor explícito con políticas RLS especializadas, permisos
de acceso a documentos privados y un circuito de aprobación separado.
Solo después vincular las matrices Conesa reales a la base; no
presumir que los borradores DEMO son evidencia de un proyecto.
