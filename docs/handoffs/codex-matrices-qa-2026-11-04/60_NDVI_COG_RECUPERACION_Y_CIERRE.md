# Continuidad del lector NDVI — 2026-11-06

La entrega inicial está integrada por PR #105: implementación `a0ebbd188687c32b7b26c6ba41f4b15666d1411b`, merge `39f88901c120c007e2d8400d9e744cbc2dbb7819`. CI completo **PASS**, run [42256133018](https://github.com/insideah64-lab/ambienta-web/actions/runs/42256133018), 44 pasos. Compilación Pages 42257501819 y despliegue 42257621986 **PASS**. Rama publicada gh-pages `0f6083a64fdec439eed1bbca0ee6449a380771ff`.

El artefacto `ambienta-matrices-handoff-qa` 13523327402 incluye las capturas completas y ampliadas, descargas y resultados de las dos demos. Digest SHA-256 `e2754c82b2db8a9cf74becf09a65aaa2059bc1be855b4dc4a5e99906b3574581`; vence 2026-12-06. Dentro: `qa/ambienta-browser-ndvi/`.

## Incidencia posterior y ajuste acotado

La primera ejecución con bandas reales desde Pages falló con **buffer error** del lector. No produjo un resultado ni reemplazó el historial. Una repetición limpia con registro de respuestas HTTP terminó en **32,4 s**, con rangos S3 206 y píxeles exactamente iguales al GeoTIFF Python anterior, incluidas máscara y georreferenciación. No se identificó de manera concluyente la causa del primer error: no corresponde atribuirlo a React, al satélite ni a una causa de caché demostrada.

Rama de seguimiento `fix/mita-browser-cog-recovery-2026-11-06`, basada en el merge anterior:

- Lector HTTP propio sobre la API pública BaseClient de geotiff.js: rangos únicos de hasta 8 MiB, credenciales omitidas, caché HTTP desactivada, timeout 30 s por intento. Rechaza respuestas completas, desplazadas (cuando Content-Range es visible por CORS) o con tamaño incorrecto. Un reintento como máximo por petición.
- La lectura de un bloque que no puede decodificarse se repite una vez con fuente recién abierta y misma grilla. Si falla, identifica la banda y conserva resultados anteriores. No hay bucles infinitos ni relleno de datos.
- Se conserva la fórmula, calibración, máscara SCL, Float32, esquema e identificadores del piloto. Este cambio refuerza la lectura; no demuestra retrospectivamente la causa del fallo inicial.

| Verificación | Estado al preparar seguimiento |
|---|---|
| TypeScript/build y 302 pruebas Node | PASS |
| Respuesta truncada, respuesta completa y rango desplazado | PASS: pruebas del cliente |
| Fallo de decodificación transitorio y persistente | PASS: reabre una vez; segundo fallo se comunica |
| Worker real con primera respuesta truncada | PASS: el ensayo exige volver a pedir ese mismo rango |
| Ambas demos, huecos, SCL20m, negativos, cuatro descargas, recarga/caché | PASS a 1366/1800 |
| Imagen real con lector reforzado | PASS local; mismo GeoTIFF píxel por píxel y misma grilla que Python |
| CI completo del seguimiento | NOT_RUN al preparar PR; registrar run y commit en el PR |
| Verificación de Pages del seguimiento | NOT_RUN al preparar PR; después de CI y despliegue |
| Guardado Storage HTTP con sesión real | NOT_RUN; pendiente descrito en 59, no crear cuentas ni mandar correos para simularlo |

Capturas reales de la primera publicación: `work/browser-ndvi-public-debug-qa/` (32,4 s, cuatro archivos, recarga, JSON con solicitudes y paridad). Capturas y archivos del lector reforzado: `work/browser-ndvi-real-qa/`. Son rutas del espacio de trabajo, no nuevas URLs públicas. Se abrieron las vistas completas/ampliadas a ambos anchos. El CI conserva las evidencias sintéticas en su artefacto; el PR de seguimiento registra el cierre definitivo y sus enlaces.

V1 y V2 públicas conservaron exactamente las huellas anteriores tras PR #105: V1 `f096a0da1bbb53d018503617aa2f0da2733aa0b8db2ec287fb962a4e332f7ef7`, V2 `9624ebf0504d45060746bce68027c39f7023cbdee3566d18fb8cc1f4b213b523`.

Acceso: [NDVI en esta PC](https://insideah64-lab.github.io/ambienta-web/v3/?caso=diablillos#/mita?analisis=vegetacion&modo=navegador). Para otro proyecto se utiliza su delimitación o se importa otro GeoJSON. Sentinel-2 NDVI es el único procesamiento incorporado a este piloto de navegador; otros sensores, índices y series conservan sus recorridos anteriores. Mantener pendiente el E2E autenticado de Supabase y la revisión separada de la dependencia MapLibre documentados en 59.
