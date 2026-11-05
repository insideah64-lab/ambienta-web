# MITA satelital — recepción de resultados

Fecha: 2026-11-05. Rama `feature/mita-resultados-2026-11-05`, basada en `bfc935dfd78babd8ad728439287538e99028b4be` (RIAM, PR #88). No se fusiona ni despliega; continúa el HOLD de la cadena anterior.

## Diagnóstico y alcance

En V3 la ruta `#/mita` solo mostraba un aviso y un enlace a V1. Se contrastó el contrato del motor existente en el repositorio privado `insideah64-lab/plataforma-ambiental-argentina`, main `9aadd4235b4e25b1887102c623287078812ca829`: `remote.py`, `raster.py`, `indices.py`, `cli.py`, `api.py`, documentación V0.2 y QA Sentinel-2. No se copia su implementación privada al repositorio público ni se alteran sus fórmulas.

El motor ya produce NDVI remoto desde Sentinel-2 L2A/Earth Search mediante `scene-ndvi`, con B04/B08/SCL, calibración explícita y productos TIFF/JSON/PNG/HTML. La API existente consulta metadatos; no ofrece procesamiento remoto autenticado. Esta entrega conecta los **archivos de resultados** con el proyecto, sin anunciar procesamiento web inexistente.

La referencia oficial [Copernicus S2 Applications](https://sentiwiki.copernicus.eu/web/s2-applications) distingue NDVI y clasificación de escena. Se conservan calibración, máscara y valores declarados por MITA; no se modifica el cálculo. Un porcentaje de nube de escena no se presenta como nube local. NDVI no se convierte en contaminación, impacto, cumplimiento ni puntuación de otra matriz.

## Implementación y contrato

- Ficha con escena, adquisición, colección, BBOX, CRS, dimensiones, NDVI mínimo/promedio/máximo y conteos válidos. Distingue el denominador de la BBOX del ráster rectangular. Cero NDVI y ausencia de píxeles válidos son estados distintos.
- Acepta exclusivamente JSON UTF-8 sin BOM del contrato nativo `engine=MITA`, `version=0.2.0`, `index=NDVI`, `provider=earthsearch`. Los informes 0.1 locales, productos atmosféricos y otros índices necesitan adaptadores posteriores; no se reinterpretan silenciosamente.
- Valida límites geográficos, fechas, escala/offset, máscara SCL 4/5/6, remuestreo, conteos, fracciones y orden/rango NDVI. Sin píxeles válidos exige estadísticas null. Requiere SHA-256 de salida y fuentes de bandas/catálogo.
- Vista previa antes de guardar. Se exige una explicación del vínculo con el proyecto: el producto no prueba automáticamente pertenencia a su perímetro. No se compara ni acredita la BBOX contra una geometría oficial.
- Cada registro conserva el texto UTF-8 original, su SHA-256 calculado, nombre de archivo, fecha de importación y vínculo declarado. Importar no modifica línea base, matrices, evidencias, V1/V2 ni el catálogo compartido.
- Clave separada `ambienta-mita-results-v1:<projectId>`, esquema `ambienta.mita-results.v1`. Máximo 20 informes de hasta 1 MiB cada uno; la cuota real del navegador puede ser menor. Registro por adición, sin botón de borrado. Original del registro anterior respaldado antes de agregar. Duplicados idénticos seleccionan la entrada existente.
- Un archivo local incompatible se bloquea y permite descargar el original literal. Otra pestaña no puede sobrescribir silenciosamente un registro más nuevo. Si falla la cuota, se mantiene la vista previa y el JSON original descargable; no se comunica un guardado exitoso.
- GeoTIFF local hasta 64 MiB: se comprueba cabecera TIFF y SHA-256 contra el informe. Esto solo demuestra coincidencia de bytes con el hash **declarado**; no certifica autenticidad del autor, estructura GeoTIFF, CRS, valores, estadística ni validez científica. El TIFF no se guarda y la comprobación vuelve a pendiente tras recargar.
- Exportación del JSON original literal y del registro del proyecto. El registro agregado es un archivo de trazabilidad; por ahora el importador acepta informes individuales, no restauraciones masivas del registro.
- No se ejecutan enlaces, HTML ni solicitudes a activos del informe importado. No se suben archivos a terceros. Persistencia local, sin sincronización ni API nueva.

## Diseño técnico

Una ficha DOM y un listado de hasta 20 productos por vista. React controla la selección y lectura de datos; sin mapa, canvas, WebGL ni librería adicional de gráficos. Estadísticas y calidad visibles, procedencia/calibración desplegables mediante teclado. El color solo destaca selección/aviso, nunca clasifica severidad ambiental.

La URL `#/mita?producto=<sha256-json>` selecciona un producto del registro local del proyecto. La URL tiene precedencia; un ID ausente se avisa, sin cargar datos ficticios ni transmitir el archivo. Recarga y enlaces directos conservan selección; el enlace no comparte los archivos entre navegadores. Contextos del proyecto y registros separados. Teléfono fuera del alcance solicitado; objetivo PC 1366/1800. Sin animaciones ni permisos de geolocalización/cámara.

Costos: hasta 1 MiB de lectura JSON; para TIFF se calcula una huella de hasta 64 MiB con WebCrypto y memoria temporal. No se procesan píxeles ni se añaden dependencias. El almacenamiento puede agotarse antes del límite de 20 informes; se avisa sin pérdida de originales. El fallback es descargar y conservar el JSON. El motor privado y su infraestructura permanecen separados.

## QA

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Pruebas unitarias | PASS | 261/261 sobre el código final; seis nuevas de MITA |
| TypeScript/Vite | PASS | Build final completo; continúan las advertencias previas de recursos CSS y tamaño de bundle |
| DEMO-001 / DIAB-2026-DEMO, 1366/1800 | PASS | Chromium limpio; cuatro combinaciones |
| Recarga y selección por URL | PASS | Conserva informe, contexto y valores; hash TIFF vuelve a pendiente |
| Descargas JSON reales | PASS | Originales y registros descargados y leídos; originales idénticos al archivo importado |
| Huellas y archivos incorrectos | PASS | TIFF coincidente, TIFF modificado rechazado, JSON incompatible rechazado |
| Almacenamiento histórico y proyectos | PASS | Claves previas intactas; registro aislado por proyecto |
| Archivo local dañado | PASS | Edición bloqueada y original literal descargado |
| Pestañas desactualizadas / cuota | PASS | Dos pestañas reales sin sobrescritura; cuota simulada con original descargable y sin confirmación falsa de guardado |
| Capturas completas y ampliadas | PASS | Ocho PNG generados; completas y fichas DEMO-001 1366/1800 abiertas y revisadas, sin recortes; espera explícita de tipografías |
| CI completo sobre rama MITA | NOT_RUN | Enlace/commit se registran en el PR al finalizar |
| Nuevo procesamiento satelital real | NOT_RUN | No se ejecutó el motor Python ni se descargaron escenas en esta entrega |
| Validación científica independiente | NOT_RUN | No se infiere de los controles del importador |
| GitHub Pages | NOT_RUN | HOLD heredado, sin publicación |

Los archivos usados por la regresión son **sintéticos para comprobar el adaptador**. La pequeña muestra TIFF prueba transporte/huellas; no contiene georreferenciación científica acreditada. Sus estadísticas no son mediciones de Salta ni Diablillos. El informe del motor de 2026-10-30 registra una ejecución real anterior, pero no se vuelve a contar como prueba de esta entrega. No se consumen créditos TinyFish/vidIQ.

Reproducción: staging `bash v3/scripts/build-v3.sh`, `node --test tests/react-v3/*.test.mjs`, servidor `dist` en 8787 y `node apps/web-v3/scripts/mita-results-smoke.mjs`. Evidencias en `qa/ambienta-mita/`, incluidas en `ambienta-matrices-handoff-qa` de CI. La batería pasa a 50 comandos de scripts de navegador, incluido P0. Fuente canónica `v3/overrides/src/features/mita/`; `apps/web-v3/` se genera.

## Siguiente paso

Definir ejecución remota autenticada con cuotas/cola/almacenamiento o un flujo local asistido del motor; después visor GeoTIFF georreferenciado, contraste de AOI/perímetro y series temporales con períodos/condiciones comparables. La API experimental existente no se transforma en un servicio público de procesamiento sin desarrollar esos componentes. No trasladar estadísticas automáticamente a la línea base ni a matrices.
