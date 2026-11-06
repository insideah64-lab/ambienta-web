# NDVI en el navegador y copia privada opcional — 2026-11-06

Base `0652749b3093b17f1f7cebbb6c5f4616bd5e1ea2` (PR #104). Rama `feature/mita-browser-ndvi-supabase-2026-11-06`. El usuario solicita comenzar el procesamiento local en navegador y delegar almacenamiento a Supabase.

## Implementación

En Vegetación → Tipo de análisis → **NDVI en esta PC · sin servidor** se importa un Polygon/MultiPolygon WGS84 o se lee la delimitación existente de Área de estudio. Los huecos se conservan; no se modifica el perímetro guardado. Se consulta Earth Search y se habilitan escenas Sentinel-2 L2A C1 que contienen toda la delimitación. Primera página de hasta 20 escenas; no es una búsqueda exhaustiva.

Un Web Worker lee rangos HTTP de los COG públicos RED/NIR/BLUE/SCL y calcula NDVI en bloques. Presupuesto piloto: dos millones de píxeles por ventana nativa de 10 m, bandas UTM sin rotación, SCL 4/5/6. Se utiliza la calibración STAC y la misma aritmética Float32/máscara común del motor Python aprobado. No se cambia la fórmula ni se convierten los valores en clases de contaminación o vegetación. La pestaña debe permanecer abierta; Supabase no ejecuta el cálculo.

Salidas reales: GeoTIFF Float32 georreferenciado, PNG transparente fuera del soporte válido, JSON con trazabilidad y CSV. Cero píxeles válidos produce estadísticas nulas, nunca ceros inventados. IndexedDB `ambienta-mita-browser-v1` permite recargar y reutilizar resultados idénticos después de verificar hashes. Límite local 128 MiB; no hay limpieza automática ni modificación de las claves históricas de localStorage.

## Supabase

Migraciones aditivas `20261106161539_mita_browser_outputs.sql` y `20261106163817_mita_browser_required_report.sql`, aplicadas en el proyecto existente. Tabla `mita_browser_results`, bucket **privado** `mita-browser-private`. Se conservan las tablas y el bucket de evidencias existentes.

La copia requiere sesión y selección explícita de un proyecto privado propio. Se conservan los identificadores locales como referencia, sin sustituirlos por UUID. Cuatro archivos, máximo 16 MiB por archivo; máximo 20 registros por usuario/día. Estados uploading/ready/failed. Hashes verificados al recuperar; metadatos, tamaño y MIME comprobados antes de ready. Ready es inmutable y no admite reemplazo/borrado desde el cliente. Una carga fallida conserva su registro y limpia únicamente sus fragmentos recién subidos. Los resultados se identifican como **client-computed**, no como verificaciones científicas independientes. No se guardan bandas originales ni se incorporan secretos administrativos al navegador.

## Evidencia

| Comprobación | Estado | Resultado |
|---|---|---|
| TypeScript y build V3 | PASS | Worker ES separado con decodificadores diferidos |
| Pruebas Node | PASS | 300 pruebas, incluidas 9 nuevas de cálculo, geometría, límites, hashes y fallos de carga |
| Chromium, DEMO-001 y Diablillos, 1366/1800 | PASS | Worker real con TIFF sintéticos: 60 centros dentro, 54 válidos, hueco, SCL20m, nubes, NoData y valor negativo |
| Descargas efectivas JSON/CSV/PNG/TIFF | PASS | Archivos abiertos e inspeccionados, no solo botones |
| Recarga y reutilización local | PASS | Mismo resultado sin nuevas lecturas de bandas; localStorage histórico intacto |
| Sentinel-2 real, escena 2025-06-08 JGN | PASS | 1276×1324 EPSG:32719; 1.138.398 centros dentro, 1.137.598 válidos; 29,3 s de descarga/proceso en esta PC; no es garantía de tiempo para otros equipos/redes |
| Paridad con GeoTIFF Python anterior | PASS | Todos los píxeles Float32 y NoData exactamente iguales; CRS y transformación iguales; diferencia máxima 0 |
| Estadísticas reales | PASS | mín. −0,2198; promedio 0,07441589752015589; máx. 0,3193 |
| Capturas completas/ampliadas 1366/1800 abiertas visualmente | PASS | Polígono completo, leyenda fija, transparencia y controles legibles |
| SQL/RLS con dos usuarios efímeros | PASS | Propietario autorizado; otro usuario/anónimo denegados; campos requeridos y carga incompleta rechazados; ready inmutable; ROLLBACK total |
| Verificación posterior de fixtures | PASS | Cero usuarios de prueba, resultados y objetos; bucket privado |
| Asesor de seguridad después de DDL | PASS | Sin nuevos avisos; INFO previo en `ambienta_sig.request_budget` (RLS sin políticas, acceso servidor) conservado |
| Guardar/recuperar por Storage HTTP con sesión real de usuario | NOT_RUN | No se dispone de una sesión autorizada; no se crearon cuentas permanentes ni se enviaron correos. Adaptador probado con fallo simulado y políticas en PostgreSQL; no equivalen a un E2E autenticado |
| CI completo y publicación | NOT_RUN al preparar PR | Actualizar estado en el PR y documento de cierre después del run |

Capturas y descargas sintéticas: `qa/ambienta-browser-ndvi/`, incluidas en el artefacto de CI `ambienta-matrices-handoff-qa`. Evidencia real local: `work/browser-ndvi-real-qa/` (cuatro capturas abiertas, descargas y `pixel-parity.json`). Los GeoTIFF comparados usan la misma escena y el perímetro ilustrativo no oficial; no representan acreditación del proyecto.

## Continuidad

1. Completar el E2E de copia privada con una sesión real autorizada (subida, recuperación en otra sesión y cierre de sesión), antes de afirmar validación integral del almacenamiento remoto.
2. Ampliar posteriormente el procesamiento local a otros índices/sensores con sus calibraciones y máscaras propias; este piloto calcula solamente NDVI Sentinel-2. Los modos anteriores continúan disponibles.
3. Dependencia preexistente MapLibre 5.19.0: auditoría npm informa GHSA-jrc7-96c5-q579, corrección publicada en una versión mayor. No se introdujo en esta entrega; no se usa `setHTML` en la capa propia. Requiere revisión separada del cambio mayor, sin `audit fix --force` sobre la versión estable.
4. El primer intento del ensayo SQL encontró la protección adicional de Storage contra DELETE directo por SQL; se corrigió el ensayo para respetar la API, sin deshabilitar esa protección. El fallo no dejó fixtures persistentes.

Fuentes: [COG y geotiff.js](https://geotiffjs.github.io/geotiff.js/), [catálogo Earth Search](https://earth-search.aws.element84.com/v1), [Storage privado y acceso](https://supabase.com/docs/guides/storage/security/access-control), [límites de Edge Functions](https://supabase.com/docs/guides/functions/limits). Skill aplicado: [Supabase](https://github.com/supabase/agent-skills).
