# MITA NDVI: vista opaca, distribución y comparación RGB

Fecha: 2026-11-05. Rama nueva `feature/mita-ndvi-visor-2026-11-05`, basada en `11d4065e934455147322351b531b5b90fdc01392` (PR #92). Investigación previa: PR #93, documentos 30/31. No se cambia NDVI, calibración, máscara metodológica, geometría ni registros anteriores. HOLD vigente: sin merge ni publicación.

## Resultado funcional

El trabajo terminado incorpora tres vistas de la misma grilla:

- **NDVI · escala fija:** rango −1 a +1, píxeles válidos opacos y exterior/nodata transparente. Conserva el significado del color para comparar con otros trabajos con la misma escala.
- **Contraste local P02–P98:** límites explícitos por adquisición y paleta azul/amarillo separada. Satura extremos solo en la representación; no modifica valores, máscara, estadísticas ni TIFF. Se identifica como exploratorio y se advierte que sus colores no sirven para comparar fechas. Si los percentiles coinciden, el modo no se habilita.
- **Color verdadero · misma fecha:** composición TCI del producto de la adquisición seleccionada, alineada a la grilla y al área válida de NDVI. Se solicita a la fuente pública al elegirla; no reemplaza el índice ni incorpora valores de NDVI.

Hay ampliación Ajustar/2×/4× con desplazamiento, consulta de NDVI por clic o por fila/columna mediante teclado, y coordenada WGS84 del centro del píxel. El zoom no agrega resolución espacial. La vista y ampliación elegidas se conservan en la URL al recargar; seleccionar otro trabajo vuelve a la escala fija. La consulta devuelve el valor científico del TIFF incluso si se está mirando RGB o contraste local.

Se agregan mediana, P02, P98 e histograma sobre píxeles válidos, con tabla de recuentos accesible. Los recuentos deben sumar exactamente la cantidad válida del resultado. Percentiles no son intervalos de confianza y calidad válida no significa vegetación sana ni exactitud científica. No se clasifican contaminación o impactos mediante el color.

Los archivos de revisión son derivados nuevos. Las descargas de TIFF/JSON y el PNG histórico se conservan byte a byte. En instalaciones sin revisión ampliada se ofrece la vista histórica con aviso explícito; si falla RGB se puede reintentar o volver a escala fija. El funcionamiento de Área de estudio y las demás herramientas permanece preservado.

## Diseño y límites

Se reutiliza React para estado/controles e imágenes ráster para el recorte. El histograma es SVG con tabla equivalente; no se incorporan motores gráficos ni dependencias de producción nuevas. No se trata como un mapa base navegable: son vistas de una grilla georreferenciada y del mismo recorte, con consulta espacial de sus centros. El visor geográfico multicapas queda pendiente.

Diseño de escritorio, según instrucción del usuario. Colores de datos: rampa fija existente; contraste local azul/amarillo distinto; barras de distribución en un único acento. Selección de modo indicada mediante botón y texto, no solo color. Enlaces/controles operables por teclado y región de imagen desplazable. Una imagen activa y hasta 40 barras por resultado. Se mantiene el límite de 12 millones de píxeles del piloto.

Fuente contextual: TCI B04/B03/B02, misma identificación de escena y carpeta de adquisición que la banda roja del NDVI. Se verifica antes de aceptar la vista RGB. Atribución: contiene datos modificados de Copernicus Sentinel, servidos por Earth Search. La composición TCI es una representación RGB, no reflectancia cuantitativa de tres bandas. El modo RGB requiere Internet la primera vez; después puede aprovechar su copia derivada local. No se aceptan destinos de descarga externos suministrados por el cliente.

## Resultados de QA

| Comprobación | Estado | Evidencia |
|---|---|---|
| Unitarias web | PASS | 271 pruebas; procedencia, recuentos, percentiles, escalas y rechazo de respuestas incompatibles |
| Motor | PASS | 69 pruebas; opacidad válida 255, exterior 0, percentiles/recuentos, constantes −1/0/+1, vacío, píxeles nodata, integridad y aislamiento por proyecto |
| RGB | PASS | Rechazo de otra escena, destino no aprobado o carpeta de otra adquisición; lectura real de TCI de la escena seleccionada |
| Build/TypeScript | PASS | Compilación local; advertencias preexistentes de assets/tamaño |
| Playwright, dos demos a 1366/1800 | PASS | Modos, histograma, píxeles válidos/nodata, zoom y vista tras recarga, fallo/reintento RGB, compatibilidad con vista histórica y pruebas anteriores de Área/descargas |
| Trabajo satelital histórico real | PASS | `1b93d1e5806220a8427e7431c569a0bd`, escena `S2B_T19JGN_20250608T143735_L2A`; sin repetir el cálculo |
| Verificación independiente | PASS | Tres PNG con la misma validez que el TIFF, alfa 255/0; mediana/P02/P98 recalculados desde los datos descargados |
| Consulta y geometría de clic ampliado | PASS | Clic a 2× recupera exactamente fila 662/columna 638; también se comprueba un píxel sin dato válido |
| Persistencia y exportación | PASS | URL conserva vista/zoom; TIFF y JSON descargados realmente y comparados con los anteriores; TIFF/JSON/PNG originales idénticos |
| Revisión visual | PASS | Capturas completas y del panel a 1366/1800 generadas y abiertas; modos fijo, local y RGB revisados; alineación de percentiles ajustada y revalidada |
| CI nuevo | NOT_RUN | Estado al crear este commit; cierre con ejecuciones y commits exactos en los PR |
| Merge / Pages | NOT_RUN | HOLD vigente; disponible solo en servicio local |
| Campo / validación externa de cobertura | NOT_RUN | Contorno ilustrativo y prueba técnica, no certificación ambiental |

FAIL de presentación detectado en documento 30: damero visible en píxeles válidos por alfa 208. Corregido en la vista derivada; se conserva el PNG histórico. Reprueba: PASS. Los casos constantes/vacíos no se presentan como contraste local fabricado.

Evidencia reproducible de CI: artefacto `ambienta-matrices-handoff-qa`, carpeta `qa/ambienta-ndvi/`. Entrega real local `AMBIENTA_NDVI_Visor_QA.zip`, con capturas revisadas, PNG derivados, originales descargados, recuentos/resultados y manifiesto SHA-256. Conservar con este handoff. Los datos del navegador de QA son independientes del navegador del usuario y no se guardaron informes nuevos en su almacenamiento.

Para probar: recargar `http://127.0.0.1:8790/v3/index.html?caso=diablillos#/mita?trabajo=1b93d1e5806220a8427e7431c569a0bd`. Alternar los modos, ampliar y consultar un píxel. La media del trabajo sigue siendo 0,074416, mediana 0,075013, P02 0,028541 y P98 0,112299. Pendientes: revisión de PR dependientes e integración autorizada, visor geográfico multicapas, series temporales, despliegue remoto autenticado y etapa posterior de contaminantes criterio. Sin gasto de créditos TinyFish ni vidIQ.
