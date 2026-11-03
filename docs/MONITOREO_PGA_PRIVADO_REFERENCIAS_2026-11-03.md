# AMBIENTA — Seguimiento privado y referencias documentales del PGA
**03/11/2026 · continuación del PR #54**

## Auditoría antes de implementar

Supabase del proyecto `plataforma-ambiental-argentina`
(`rqzeejnhszbbohaqdpgp`) ya disponía de:

- `monitoring_inspections`: `project_id`, `measure_id`,
  `recorded_by`, `scheduled_for`, `result`, `note`.
- `environmental_evidence`: `project_id`, `measure_id`,
  `inspection_id` opcional, `created_by`, `label`,
  `reference_label`, `status='pending'`; metadatos privados
  de archivo opcionales y validados por restricciones.
- RLS activado. INSERT de inspecciones y referencias limitado a
  expedientes cuyo `owner_id = auth.uid()`, con `recorded_by`
  y `created_by = auth.uid()`, respectivamente. SELECT también
  restringido al propietario.
- Claves foráneas compuestas:
  `monitoring_inspections(project_id,measure_id)` referencia
  `management_measures(project_id,id)`;
  `environmental_evidence(project_id,inspection_id,measure_id)`
  referencia el registro correspondiente de inspección.
- El análisis de seguridad reportó un aviso INFO por
  `ambienta_sig.request_budget` con RLS pero sin políticas; no se
  cambió porque puede tratarse de una tabla intencionadamente
  inaccesible por la API y no forma parte del alcance.
- La tabla de proyectos reales seguía vacía al consultar;
  no se insertaron registros de ejemplo ni se creó ningún usuario.

## Funcionalidad implementada

En `Espacio privado → expediente → Monitoreo del PGA`:
1. Una sesión Supabase autenticada abre un expediente propietario.
2. «Nueva inspección» permite elegir **una medida existente del
   mismo expediente**, fecha, resultado y nota de seguimiento.
   El resultado `pending` es predeterminado y los otros estados
   se muestran explícitamente como **declaraciones del usuario**.
3. «Nueva referencia documental» permite elegir medida y,
   opcionalmente, una inspección **de esa misma medida**. Se registran
   descripción y código/referencia de fuente, sin subir archivos.
4. El repositorio existente ejecuta `createInspection` o
   `registerEvidence`, con `auth.getUser()`, verificaciones UUID
   y RLS/FOREIGN KEY como autoridad final de PostgreSQL.
5. Después de una inserción confirmada se recarga el expediente,
   sin repetir automáticamente la inserción aunque falle la lectura.
6. Se listan los registros por identificadores originales, estados,
   observaciones y advertencias de correspondencia documental.
7. Se ignoran resultados asíncronos de sesiones anteriores y se
   limpian mensajes residuales de una cuenta tras cerrar sesión.

## Reglas estrictas
- Nada se importa de Diablillos ni de borradores Conesa locales.
- No se usan nombres o factores para adivinar vínculos: solo IDs.
- `status='pending'` en referencias significa **pendiente**, no
  evidencia verificada. No se inventan inspecciones ni resultados.
- El estado `conformant` es una declaración, **no** una inspección
  profesional acreditada ni cumplimiento normativo.
- Los resultados no alteran puntajes Conesa ni crean informes
  ambientales aprobados.
- El piloto de subida de documentos privados permanece desactivado.
  No se añade un bucket público ni se generan URLs de descarga
  públicas.
- No se crea nueva tabla, función, política ni migración.
- No se habilitan firmas ni usuarios revisores.
- Las pruebas son mocks de cliente y ensayos de visitante sin
  credenciales; **no** prueban el acceso cruzado entre dos cuentas
  reales.

## Verificaciones
- Suite Node: fechas calendario reales, resultados permitidos,
  campos válidos, rechazo por proyecto/medida/inspección disjuntos,
  verificación de identidad y rechazo por RLS simulado.
- Se comprueba que `registerEvidence` solo registra metadatos
  `pending`, no crea objetos de Storage ni hashes supuestamente
  verificados.
- La proyección de seguimiento excluye filas de otros proyectos y
  muestra conflictos en lugar de atribuirlos a otra medida.
- Playwright de visitante: no aparecen formularios de inspección
  ni referencias; el localStorage de DEMO no se modifica.
- CI integral de V3 y preservación V1/V2 deben pasar antes de fusionar.

## Configuración y próximos bloqueos

Existe clave **publishable** de Supabase activa y URL de proyecto
consultable por el conector. La compilación Pages sigue requiriendo
configuración de dos variables públicas de GitHub Actions:
`AMBIENTA_SUPABASE_URL` y
`AMBIENTA_SUPABASE_PUBLISHABLE_KEY`. Se deben usar **variables de
repositorio** y nunca una clave `service_role`, una secret key
`sb_secret_` o un JWT privado en Vite.

La verificación con dos usuarios reales y el circuito de revisión
profesional continúan retenidos. Ningún estado documental podrá
promoverse a «aprobado» solo por tener una inspección o evidencia.
