# NDVI — interfaz de procesamiento local

Fecha: 2026-11-05. Rama nueva `feature/mita-ndvi-local-2026-11-05`, basada en `1cedf395e107db595836c6e52419560438da73d9` (PR #89). Este documento público describe la interfaz y su QA; no reproduce implementaciones ni contratos internos de repositorios privados.

## Alcance

Solo NDVI. La versión asistida local permite definir una ventana, buscar escenas, elegir una y enviar un trabajo. Recupera estado y parámetros después de recargar, muestra vista previa con leyenda, calidad y estadísticas y permite descargar GeoTIFF/JSON. El resultado se envía al importador existente para revisión explícita; no se registra automáticamente ni completa matrices o línea base.

La versión estática conserva el importador. Sin un servicio compatible anunciado por la instalación, los controles de cálculo permanecen deshabilitados y no se generan solicitudes API fallidas. La vista previa no se presenta como perímetro acreditado ni como mapa georreferenciado completo.

Se conservan esquemas, identificadores y almacenamiento previo. El historial de trabajos pertenece al servicio local y la selección utiliza `trabajo` en la URL; las entradas locales de resultados mantienen su esquema anterior. No se incorporan contaminantes criterio ni se cambian fórmulas de matrices.

## Diseño de la vista

Una vista DOM por página, listado de escenas con nube y cobertura declaradas, historial de trabajos, una imagen de vista previa y valores visibles. Sin nueva biblioteca gráfica, WebGL ni dependencia de mapa. La leyenda usa las paradas comunicadas por el servicio y tiene etiquetas −1, 0 y +1; transparencia indica ausencia de datos. No clasifica contaminación ni severidad ambiental.

Filtros en el formulario, selección de escena explícita, estado de trabajo en URL y parámetros recuperados del historial. Cambiar el área o período invalida la búsqueda anterior. Controles nativos de teclado, texto alternativo y estados anunciados. Objetivo PC 1366/1800; teléfono fuera del alcance solicitado. La página pública no almacena rásteres en localStorage.

## Resultados del corte local

| Comprobación | Estado | Evidencia |
|---|---|---|
| TypeScript/Vite | PASS | Build completo, sin nuevas dependencias |
| Pruebas unitarias de web | PASS | 265/265; cuatro nuevas de consulta, límites, leyenda y rutas |
| Pruebas del servicio local | PASS | 55 pruebas, conservando los controles numéricos existentes |
| DEMO-001 / DIAB-2026-DEMO a 1366/1800 | PASS | Cuatro combinaciones, Chromium limpio y servidor HTTP sintético |
| Doble clic y recarga | PASS | Un envío; mismo trabajo y parámetros recuperados |
| Descargas sintéticas | PASS | GeoTIFF/JSON descargados y hashes contrastados |
| Trabajo satelital real | PASS | Piloto técnico de Salta; escena elegida, proceso local y archivos reales |
| Descargas reales | PASS | GeoTIFF/JSON leídos y huellas coincidentes |
| Reinicio del servicio | PASS | Trabajo terminado y archivos conservados |
| Revisión antes de guardar | PASS | No se registra resultado hasta justificar su vínculo |
| Capturas completas y ampliadas | PASS | Generadas y abiertas a ambos anchos; nueva revisión al cerrar cualquier ajuste visual |
| CI remoto | NOT_RUN | Se enlaza el resultado final en el PR |
| Procesamiento publicado en Internet | NOT_RUN | Servicio solo local; no se despliega |
| Validación científica independiente | NOT_RUN | No se infiere de la conectividad ni de estos tests |
| Contaminantes criterio | NOT_RUN | Etapa posterior, expresamente fuera de alcance |

Resultado técnico real: escena S2B_T20JKT_20250529T143737_L2A, 52×57 píxeles, EPSG:32720. NDVI mínimo 0,006998; promedio 0,506619; máximo 0,825769. 2.805 válidos dentro de la ventana; el ráster rectangular contiene 2.964 píxeles. El piloto no acredita el emplazamiento de una demo ni constituye evaluación ambiental.

Los tests de interfaz con datos sintéticos se mantienen separados de esa ejecución real. Los primeros intentos de descarga interceptada del harness quedaron FAIL por cancelación de Chromium; se corrigió el transporte del test usando un servidor HTTP real, sin debilitar las comprobaciones ni cambiar los enlaces del producto.

Código canónico de interfaz: `v3/overrides/src/features/mita/NdviClient.ts`, `NdviWorkbench.tsx`, CSS y conexión al importador existente. Regresión: `ndvi-workbench-smoke.mjs` y `tests/react-v3/ndvi-client.test.mjs`. La batería CI incorpora esta prueba y conserva P0 y hashes V1/V2. Capturas sintéticas y descargas en `qa/ambienta-ndvi/`, artefacto de QA de matrices.

## Continuidad

Mantener el servicio en modo local para esta etapa. Pendientes: ejecución remota autenticada, despliegue y presupuesto, pruebas de carga, polígonos del proyecto, mosaicos, series temporales y visor georreferenciado completo. No ampliar todavía a contaminantes ni reinterpretar NDVI como calidad del aire. Continúa el HOLD heredado; no se fusiona ni publica sin resolver sus condiciones.
