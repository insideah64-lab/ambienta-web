# AMBIENTA — Primera alta de expedientes ambientales privados (03/11/2026)

## Recuperación de la arquitectura real

Supabase conectado: proyecto `plataforma-ambiental-argentina`.
Existe el esquema ambiental creado por `environmental_core_v06` y
la capa de evidencias privadas `private_evidence_storage_v08`.
La inspección documental encontró tablas de proyectos, impactos,
programas, medidas, inspecciones y evidencias con RLS habilitado.
En la consulta inicial **todas las tablas del dominio ambiental estaban vacías**.

La aplicación ya incluía `/nube` y un repositorio `web/cloud/repository.mjs`
con métodos de creación y carga autenticada. Esta entrega habilita
únicamente su **interfaz de alta** en la variante web V3.

## Alcance autorizado en código
- El usuario debe iniciar sesión de forma explícita con Supabase Auth.
- Solo entonces se muestra el botón **Nuevo expediente privado**.
- La creación usa `createEnvironmentalRepository.createProject`, con
  `auth.getUser()`, `owner_id` del usuario verificado, fase `planning`
  y estado `draft`. El usuario escribe nombre, provincia, sector y
  proponente opcionales; no se deducen del caso de muestra.
- Dentro del proyecto autenticado se permite dar de alta impactos
  (código, título, factor, fase, signo) y programas PGA
  (código, categoría, descripción) mediante los métodos existentes.
- Tras guardar, se recarga el expediente desde la base. Si la lectura
  falla después de un INSERT exitoso, se informa que **ya fue creado**
  y nunca se invita a repetir automáticamente el INSERT.
- Los expedientes privados se muestran **exclusivamente** en `/nube`.
  Los formularios de Diablillos, los borradores locales de Conesa,
  los informes DEMO, mapas y polígonos no se copian ni reinterpretan.
- No se crean usuarios, proyectos, impactos ni archivos en la base
  durante el despliegue o las pruebas automáticas.
- No se crea, actualiza ni migra ninguna tabla de producción.

## Publicación controlada
La compilación Pages de V3 puede leer las variables públicas de
repositorio GitHub Actions:
- `AMBIENTA_SUPABASE_URL`
- `AMBIENTA_SUPABASE_PUBLISHABLE_KEY`

Solo se trasladan como `VITE_SUPABASE_URL` y
`VITE_SUPABASE_PUBLISHABLE_KEY` durante la compilación de V3.
**No** configurar una clave de servicio, service_role, secret o JWT
privado. Sin estas variables, la pantalla mantiene el bloqueo actual
y no realiza consultas Supabase. El build de V1/V2 no cambia.

## Evidencias y revisión profesional (HOLD)
- El bucket existente `environmental-evidence-private` es privado y
  está sujeto a RLS. El piloto de archivos sigue apagado:
  `VITE_ENABLE_PRIVATE_EVIDENCE_UPLOAD` no se activa aquí.
- Actualmente `environmental_projects.owner_id` limita el acceso
  a expedientes de su propio propietario. No existe en esta fase
  un rol de revisor independiente ni una firma profesional.
- El esquema permite estados documentales de borrador/revisión,
  que no equivalen a un dictamen ambiental.
- Faltan pruebas E2E con dos cuentas autenticadas, alta de medidas,
  autorización cruzada de archivos y conexión real de matrices
  antes de habilitar informes profesionales.

## Calidad y límites
- Test unitario de validación de formulario e invocación del
  repositorio, rechazo anónimo y rechazo de ID DEMO como UUID.
- Playwright 1366/1800 sin credenciales: muestra estado
  desconectado o formulario de inicio de sesión, **sin** altas
  privadas accesibles para el visitante.
- Comparación de localStorage antes y después de recargar `/nube`.
- CI V3 completo conserva integridad V1/V2 y los regresores previos.
- La prueba de dos usuarios y la efectiva autorización RLS en un
  navegador conectado no se afirman como completadas.

## Próxima etapa
Alta de medidas vinculadas a impactos con la transacción existente
`create_measure_with_impact`; después, pruebas negativas de acceso
entre dos usuarios, controles de integridad de adjuntos y diseño
formal de permiso/revisión profesional. No introducir políticas
permisivas de `TO authenticated` sin restricciones por propietario.
