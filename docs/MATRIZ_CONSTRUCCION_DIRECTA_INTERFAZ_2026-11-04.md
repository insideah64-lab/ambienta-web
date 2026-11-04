# AMBIENTA · Construcción directa de matrices en su propia tabla

Fecha: 2026-11-04. Solicitud de usuario: construir matrices de identificación, Leopold y ponderación desde la misma grilla, sin depender de los formularios bajo el cuadro.

## Cambios

- Nuevo bloque **«Construí la matriz desde la tabla»**, inmediatamente encima del encabezado: agregar acciones con su fase y factores con su grupo; los límites se mantienen en 150 por eje.
- Encabezados de columnas y de filas con botones accesibles para **editar** y **eliminar**. Editar abre controles en el propio encabezado y permite confirmar con el botón de guardar o cancelar sin escribir. Se conservan los identificadores estables, las celdas guardadas, los fundamentos y las evidencias al renombrar/reagrupar/reclasificar.
- Las modificaciones se validan antes de persistirse. En factores, peso exploratorio entre 0,1 y 5. Eliminar es destructivo y requiere confirmación explícita; solo borra las interacciones asociadas a la fila/columna eliminada.
- Nuevo espacio de trabajo **matriz + inspector al costado** en escritorio. Al seleccionar cualquier celda, la evaluación queda en el panel adyacente, sin bajar a la zona administrativa. Atajos visibles para marcar signo adverso/beneficioso, ausencia de interacción o no evaluado; magnitud 1–10, importancia 1–10, razones, evidencia y borrado siguen accesibles allí.
- «Herramientas avanzadas» queda debajo con incorporación de factores existentes del expediente, catálogo legado y pesos, reinicio y las operaciones anteriores. El formulario de alta ya no está duplicado.
- Si el filtro «Solo factores con interacciones» estaba activo, agregar un factor/importar factores lo desactiva para que los nuevos elementos sean visibles, en lugar de parecer que falló el alta.
- El constructor preserva el esquema `ambienta.impact-matrix.v1`, clave `ambienta-impact-matrix-v1:<projectId>`, importaciones, CSV/JSON y los tres modos de lectura (`identificacion`, `leopold`, `ponderada`). No inventa valores por celda ni cambia los criterios de Leopold o Conesa.

## Restricciones y método

- El catálogo genérico de ejemplo no implica que las actividades sean propias del proyecto.
- No se preclasifican impactos al crear filas o columnas; celdas sin completar siguen como **no evaluadas**, diferentes de «sin interacción».
- No se calcula una evaluación ambiental aprobatoria ni se compensan impactos por suma de productos M × I.
- Los valores se guardan en el navegador, por expediente. No se integran automáticamente en el registro documental ni se certifican.

## QA

Extensión del Playwright `v3/overrides/scripts/impact-matrix-builder-smoke.mjs` en 1366/1800px: inspector dentro del lienzo, acceso a marcación rápida de signo, creación desde barra junto a grilla, fase de acción, cambio de nombre/grupo/peso con IDs preservados, eliminación con confirmación, CSV/JSON sin pérdida, recarga y ausencias de overflow. Se mantienen todos los tests CI y controles de integridad V1/V2.

**HOLD**: no fusionar hasta `CI SUCCESS`, Chromium + capturas y verificación de la publicación de GitHub Pages.
