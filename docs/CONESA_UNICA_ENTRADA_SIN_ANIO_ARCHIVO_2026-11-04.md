# AMBIENTA · Conesa como única edición principal sin año visible

Fecha: 2026-11-04. Solicitud: el usuario quiere UNA única opción «Conesa», sin «1997» en el nombre para evitar confusión.

## Decisión

- La tarjeta única del catálogo se titula **Conesa**, sin año. Conserva el ID histórico técnico `conesa-simplificado-tutorial-v1` para compatibilidad del catálogo, **pero renderiza** `ConesaLibroPanel` como ÚNICO editor principal.
- Su título visible es **Conesa**. Se retira el interruptor «Según libro · Conesa 1997 (experimental) / Simplificado · Excel anterior».
- El motor principal no cambia: utiliza el esquema/versionado y la clave existente `ambienta-conesa-libro-1997-f1:<projectId>`, parámetros, importaciones/exportaciones y controles; **no se migran automáticamente** puntuaciones del Excel anterior.
- La bibliografía de la fuente conserva su fecha en las referencias metodológicas y en metadatos técnicos; eliminarla de la cabecera **no implica** sustituir fuentes ni afirmar que todas las ediciones del método sean idénticas.
- El motor del libro sigue sujeto a validación profesional: una interfaz más simple no implica homologación normativa.

## Documentos antiguos

- Si existe `ambienta-conesa-simplificado-v1:<projectId>` válido, mostrar un bloque **Archivo histórico** que permite consulta, tabla de revisión, CSV y JSON del motor simplificado **sin capacidad de modificación**. El panel se monta solo si el usuario expande el archivo.
- Si el archivo está dañado o tiene formato no válido, **no** mostrar un borrador vacío fingiendo que contiene los datos; ofrecer exportación exacta del texto original, sin sobrescribirlo.
- Si existe `ambienta-conesa-residual-v1:<projectId>`, ofrecer exportación íntegra de ese registro, incluidos metadatos de medidas y vínculos PGA, sin activar su editor antiguo ni trasladarlo a Conesa.
- El archivo aún anterior `ambienta-scored-matrix-v1:<projectId>:conesa-1997-2ex` conserva su lectura/CSV/JSON o respaldo en caso de datos dañados, sin editor paralelo en el catálogo.
- Sin datos previos no se muestra ningún bloque de archivo histórico. Ninguna nueva puntuación se crea al abrir Conesa.

## Verificación

- Tests del libro F1/F2/F3a/F3b y Anejo 4 se abren directamente desde Conesa, sin interruptor.
- `matrix-method-catalog-smoke.mjs` verifica un solo editor principal, encabezado sin fecha, archivo simplificado y 2ex en solo lectura, exportaciones y recuperación de archivos dañados.
- `conesa-simplificado-excel-parity-smoke.mjs` mantiene verificaciones de 28/47/66/44/62 del Excel histórico; excluye RV=3 como anomalía y comprueba CSV/JSON, elementos huérfanos y falta de escrituras de edición histórica.
- `conesa-residual-smoke.mjs` prueba que el borrador residual antiguo permanezca íntegro y sus vínculos documentales se recuperen mediante descarga sin reabrir el editor legacy.
- Preservar test numéricos, pruebas completas de navegador y hashes V1/V2. Bloqueo de merge si CI no está verde.

**Nota:** las claves internas, archivos y atributos `data-*` conservan el ID legado por compatibilidad; ese nombre **no** se presenta como una segunda opción de Conesa para el usuario.
