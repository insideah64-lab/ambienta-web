# AMBIENTA V3.5.6 — Centro de trabajo / Jerarquía del resumen
Fecha: 2026-11-01. PR experimental #19 sobre V3.5.5, sin integrar V3.6–V3.9 experimentales.

## Decisión editorial
El usuario eligió centrarse en escritorio y pidió mejorar la comprensión de la interfaz. La V3.5.5 aumentó los tamaños, pero el resumen aún distribuía tareas y registros en tarjetas de igual prominencia.
El criterio ahora es: identidad del proyecto → **trabajo por atender** → indicadores agregados → operación y territorio → actividades y contexto.

## Contrato estricto
- **Solo estados del expediente**, no valoración ambiental automática ni clasificación legal de gravedad.
- Estado de seguimiento: hallazgos `abierto` y acciones correctivas `abierta/abierto/pendiente/en_ejecucion/en_revision`.
- Estado de revisión: medidas `en_revision`, evidencias `pendiente` e inspecciones con resultado `pendiente`.
- El número visible es recuento de **registros por etapa**, no de problemas ambientales independientes. Un hallazgo y una acción vinculada son dos registros diferentes; deben permanecer identificables.
- Sin datos pendientes: la UI dice que no hay **registros** pendientes, **no** que se ha verificado cumplimiento.
- No inventar urgencia ni plazos vencidos; una observación `menor` simulada no se convierte en incidencia crítica.
- Cada vínculo conduce al módulo actual (/auditorias, /pga, /evidencias, /monitoreo); ninguna acción cambia registros desde el resumen.
- No reemplaza el mecanismo real de revisión ni agrega permisos, firmas o consecuencias sobre el dominio.
- La cartografía QA conserva explícitamente su carácter no oficial.

## Implementación
- `v3/overrides/src/features/dashboard/work-priorities.mjs`: selector determinista puro; recalcula a partir del expediente vigente, sin mutación.
- `v3/overrides/src/features/dashboard/ReferenceDashboard.tsx`: override de V3 separado de V2; `WorkAttention` antes de métricas, dos columnas para operación/territorio y sección secundaria para actividad/contexto. Se retira tarjeta duplicada de alertas.
- `v3/overrides/src/desktop-readability.css`: composición de escritorio, tarjetas no alarmistas con jerarquía de lectura; no hay trabajo móvil.
- `tests/react-v3/work-priorities.test.mjs`: demuestran conteos sin duplicidad accidental, actualización tras cierres, ausencia de falsos pendientes, no mutación.
- `v3/overrides/scripts/work-priorities-smoke.mjs`: Chromium 1800/1440/1366, jerarquía y navegación reales, sin scroll horizontal, capturas de pantalla.
- `.github/workflows/v3-preview.yml`: preserva tests anteriores Node/Chromium, hash V1/V2 y artefacto de capturas `ambienta-v356-prioridades-capturas`.

## QA y publicación
No fusionar hasta CI SUCCESS y examinar las imágenes. No atribuirle verificación de cumplimiento a la etiqueta de “sin pendientes”. No modificar V1 ni V2.
Branch experimental: `feature/ambienta-v356-prioridades-escritorio-2026-11-01`.
Backup inicial: `backup/ambienta-v356-prioridades-checkpoint-2026-11-01`.
PR: https://github.com/insideah64-lab/ambienta-web/pull/19
