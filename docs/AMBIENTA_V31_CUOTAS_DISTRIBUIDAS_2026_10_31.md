# AMBIENTA V3.1 — Cupos SIG compartidos y telemetría privada
**Fecha:** 31 de octubre de 2026. **Estado:** gateway Supabase Edge `ambienta-sig-v31` desplegado como prueba aislada; promoción del frontend sujeta a QA.

## Problema resuelto
V3 utilizaba contadores de llamadas por instancia, no válidos como presupuesto global cuando Supabase escala. Las pruebas de CI repetidas agotaron efectivamente el cupo de V3.1, cuyo rechazo 429 funcionó; se separaron pruebas sintéticas de consultas reales para evitar agotar un proveedor público.

## Diseño
- Migración aplicada en el Supabase existente: `ambienta_sig_shared_quota_v31`, fuente en `services/sig-gateway/migrations/ambienta_sig_shared_quota_v31.sql`.
- Tabla **privada** `ambienta_sig.request_budget` con clave primaria `(period_seconds,bucket,scope)`, `RLS ENABLED` sin políticas para acceso público, y permisos de escritura únicamente a `service_role`. No almacena IP, BBOX ni datos de los expedientes.
- Función `public.ambienta_sig_reserve_quota(text)` **SECURITY INVOKER**, sin elevación de privilegios, `search_path=''`. Su `EXECUTE` se denegó a `PUBLIC`, `anon` y `authenticated`; se concedió solo a `service_role`. Supabase confirmó `anon_can_execute=false`, `authenticated_can_execute=false`, `service_can_execute=true`.
- `pg_advisory_xact_lock` serializa la comprobación atómica. Primero verifica todas las ventanas y solo después incrementa los contadores en la misma transacción.
- Límites compartidos iniciales: **12/min global**, **8/min por capa**, **120/h global**, **60/h por capa**, **500/d global**.
- El backend `edge-v31` realiza la llamada autenticada desde la propia función Edge con `SUPABASE_SERVICE_ROLE_KEY`, que **nunca** aparece en el JavaScript público. Se requiere un JWT anon público válido para invocar Edge, pero no para acceder al controlador de cuotas directamente.
- Cuando Postgres no está disponible, responde HTTP **503** y no consulta IDESA (fallo cerrado). Ante cupo agotado devuelve HTTP **429** con `Retry-After`; la interfaz muestra un texto de reintento. **No** se fabrica una respuesta parcial.
- La concurrencia local sigue limitada a 2 solicitudes simultáneas por instancia como segunda defensa.
- Se mantienen límites de 1 MiB, 20 entidades WFS, 12.000 vértices, BBOX controlada, validación de completitud, topología y SHA-256 de la respuesta WFS **cruda**.
- Telemetría segura: logs estructurados en Edge con `layer`, `outcome`, `code`, `status`, `durationMs`, `sourceCount`, `selectedCount` y `sourceBytes`. Nunca incluyen IP, BBOX, nombres de expedientes, geometrías completas ni secretos.

## Estado de verificación
1. Migración PostgreSQL aplicada: PASS. Un RPC legítimo confirmó `{"allowed":true,"policy":"global_shared"}`.
2. ACL SQL: anon/authenticated sin `EXECUTE`; service_role con permiso: PASS. Tabla privada con RLS activo: PASS.
3. Prueba Deno `quota.test.ts`: reservas, denegación, falta de credenciales, respuestas de error y fallos de red: PASS en GitHub Actions.
4. `ambienta-sig-v31` separado de `ambienta-sig-v3`: desplegado con `verify_jwt=true`. E2E real autenticado de cuota + WFS y denegación de RPC anon: PASS.
5. Frontend: prueba determinista en Chromium usa polígonos sintéticos (incluidos huecos) y conserva recorte, fuente, SHA y exportación. **No consulta IDESA en cada commit.** Las verificaciones reales quedaron reservadas para ejecución expresamente controlada.
6. El linter de Supabase informa `INFO: RLS Enabled No Policy` para la tabla privada. **Es deliberado:** el rol público no tiene acceso; no se debe crear una política `anon` solo para borrar el aviso.

## Límites pendientes
- Este es un **presupuesto global**, no un cupo individual por persona: el JWT anon público no identifica al solicitante. Para cuotas por usuario se requiere autenticación real.
- Cupos nuevos reducen la capacidad total bajo alta demanda. Superar un límite es una denegación deliberada, no un error de geografía.
- Postgres guarda ventanas de cuota; falta una tarea de purga de filas antiguas y supervisión de consumo a largo plazo. La purga futura debe ser un proceso controlado, no borrar datos sin confirmar.
- Las licencias de redistribución de las capas de IDESA **siguen sin certificarse**; la fuente pública se consulta, pero el gateway no almacena ni redistribuye una base provincial completa.
- Grandes polígonos, WFS paginado y topologías más complejas quedan bajo el siguiente frente GEOS/Shapely. No se habilita exportación truncada.
- V1/V2 siguen intactas; la BBOX del usuario no es un perímetro real del proyecto.

**Enlaces:** [PR V3.1](https://github.com/insideah64-lab/ambienta-web/pull/4), [acta base V3](./AMBIENTA_V3_SIG_GATEWAY_2026_10_31.md).
