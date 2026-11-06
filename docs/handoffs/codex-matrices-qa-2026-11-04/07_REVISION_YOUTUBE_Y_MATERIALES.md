# Revisión gratuita de YouTube y materiales enlazados

Fecha: 2026-11-04. Continuación del PR #85. HEAD de partida comprobado en GitHub: `2fea30019244acf0679bf2737b789be8091400f9`. Se mantiene el HOLD de [03_CONTINUIDAD_QA_Y_HOLD.md](03_CONTINUIDAD_QA_Y_HOLD.md). Esta revisión agrega documentación; no cambia código, fórmulas, criterios, almacenamiento ni datos históricos.

## Conclusión

La fórmula ordinaria F1 de AMBIENTA coincide con el Excel Conesa público examinado. Se ejecutó el motor real con sus entradas y se obtuvo −51, igual que el cálculo de la hoja. Esto respalda la fórmula base; no certifica el método completo ni resuelve las excepciones de 1997 registradas en [04_CONTRASTE_LIBRO_ORIGINAL.md](04_CONTRASTE_LIBRO_ORIGINAL.md).

Las plantillas descargadas contienen adaptaciones, resúmenes manuales y etiquetas que requieren interpretación. No deben convertirse en especificación automática de AMBIENTA. No hay evidencia nueva que justifique modificar F3a/F3b o afirmar que ΔCA ya equivale a Vj y al impacto total.

## Acceso y alcance comprobados

Solo fuentes gratuitas. No se invocaron búsquedas, transcripciones ni análisis pagos de vidIQ; tampoco TinyFish.

Se leyeron directamente los metadatos públicos de YouTube (`videoDetails.shortDescription`), sin cuenta ni credenciales, para confirmar autor, título y descripción de siete videos. La lectura directa por HTTP permitió continuar aunque el buscador no accedía a esas páginas.

La reproducción y transcripción completas siguen **BLOCKED**: las capturas anteriores quedaron en carga, los subtítulos descargados devolvieron cuerpo vacío y la petición de transcripción respondió 400. El navegador integrado no estaba disponible; el control de Chrome se detuvo al no poder comprobar la URL activa. **No se afirma haber visto íntegramente los videos ni haber validado su explicación oral.** Los resúmenes de terceros sirvieron únicamente para localizar candidatos; no se usaron como prueba de fórmulas ni se atribuyen tiempos no verificados.

| Video y autor | Descripción comprobada y material |
|---|---|
| [Explicación metodología de Vicente Conesa — Udearroba](https://www.youtube.com/watch?v=dLR64iQOwyY) | Identifica Facultad de Ingeniería / Universidad de Antioquia. Sin enlace a plantilla en la descripción recibida. |
| [Metodologías de identificación y valoración — UPV / Inmaculada Romero Gil](https://www.youtube.com/watch?v=WinSvzQDTRY) | Enlaza [registro institucional](https://hdl.handle.net/10251/80639) y cursos. No ofrece Excel en esa descripción. El registro no pudo recuperarse en esta revisión; no se presume leído. |
| [Matriz de Vicente Conesa — David Felibert con Manuel Guineme](https://www.youtube.com/watch?v=3MVxvAjDggs) | Descripción con presentación y enlaces profesionales; sin plantilla descargable. |
| [Leopold y Conesa (ASPI–FARI) — Más práctica Menos Teoría](https://www.youtube.com/watch?v=ErEJ5XN8-s0) | Enlaces de contacto; sin archivo de matrices en la descripción actual. |
| [Matriz de Leopold — Alex Enseña](https://www.youtube.com/watch?v=4SbW6G9XjhM) | Describe ejemplo de una bananera; sin enlace de descarga. |
| [Leopold en Excel — Don Franz](https://www.youtube.com/watch?v=dLEzvDH0deg) | Enlaza [página del autor](https://franzpc.com/descargar-la-matriz-de-leopold-en-excel/), que enlaza el Excel descargado. |
| [2 Metodología de identificación y evaluación — SIGAMBIENTAL](https://www.youtube.com/watch?v=UNiMK-VlYHU) | Enlaza [carpeta pública](https://drive.google.com/drive/folders/12j7_RVzMyKogGBnOGqGNRaFXg9OG3q9v). Se descargaron dos Excel y un PDF, sin iniciar sesión. |

Estas afirmaciones se limitan a las descripciones recuperadas en esa fecha, no a comentarios, membresías ni todos los materiales de cada canal.

## Archivos realmente descargados

Se comprobaron contenedores XLSX y contenido PDF. Se inspeccionaron celdas, fórmulas y relaciones OOXML sin ejecutar macros. No se alteraron archivos ni se recalcó con Microsoft Excel. Los resultados guardados de Excel se contrastaron con cálculos independientes cuando se indica; no se toman como prueba de sincronización.

| Fuente | Tamaño y SHA-256 |
|---|---|
| [Don Franz: Matriz-de-Leopold.xlsx](https://franzpc.com/wp-content/uploads/2023/09/Matriz-de-Leopold.xlsx) | 27.217 bytes; `57b2da8025ad7809030f9ef604551d720e2c99bc26a647c0811bd75cb49686e4` |
| [SIGAMBIENTAL: MATRIZ CONESA.xlsx](https://drive.google.com/file/d/1sGcp-ZQb_y_lA6OuDOERqSfRL67z3T_P/view) | 37.648 bytes; `208cbe08ee81a2e3b58316ffe2118fa14a3709715d3bec0a0b4ceefede192958` |
| [SIGAMBIENTAL: MATRIZ DE LEOPOLD.xlsx](https://drive.google.com/file/d/1jsq__WWOqvvINClwrEPXrjLSq4WdypkO/view) | 26.110 bytes; `a404f991369c8182008d8ff3db813edd352c83bf9e0f4648a95458337127bcb4` |
| [SIGAMBIENTAL: Metodologías, PDF](https://drive.google.com/file/d/1OZz86Cmfax2nKy3eTuwGzwgCQnSemuAZ/view) | 1.347.609 bytes, 15 páginas; `36ea56de52ff71afbbbb3d12bbc3a7996fb3be0f28af546cb93fbaaccf0a889f` |

Se usó la habilidad de hojas de cálculo para la inspección de los libros y la de PDF para extraer y revisar visualmente las diapositivas. Se abrieron una lámina de contacto de páginas 2/4/5/6/7/8/9/11 y la página 6 ampliada. Los materiales de terceros y sus páginas completas no se incorporan a GitHub; se conservan enlaces y huellas para reproducir el contraste.

## Resultados concretos

**PASS — F1 ordinaria, caso externo.** En `OFICINA!K19:U19` del Excel SIGAMBIENTAL: signo −1; IN=8, EX=2, MO=4, PE=4, RV=4, SI=1, AC=1, EF=4, PR=4, MC=1. La fórmula de `V19` pondera IN por 3 y EX por 2, y suma los restantes atributos. Su resultado es −51. Se transpilaron e importaron las funciones del `ConesaLibroModel.ts` existente, con recargos EX_CR=MO_CR=0, y `calculateBookConesa` devolvió absoluto 51, firmado −51, categoría Severo. No se inyectaron estas entradas en DEMO-001 ni en almacenamiento del usuario.

**FAIL como referencia automática de sincronización — resumen Conesa.** `MATRIZ FINAL!K19` contiene el número fijo −19, sin fórmula de enlace con `OFICINA!V19` (−51). `V19` de la matriz final contiene una calificación textual fija. `U19` promedia K19:T19, incluyendo ceros numéricos, y guarda −9,4. Esto puede ser un ejemplo preparado en otro momento; no demuestra un fallo de AMBIENTA. Sí demuestra que ese resumen no sirve para exigir sincronización automática ni para equiparar el promedio a F1, ΔCA o Vj.

**PASS aritmético limitado — Don Franz.** Se recalcularon independientemente los productos de las cinco interacciones de cada uno de los diez factores de la hoja B. Coinciden con P5/P7/…/P23: −29, −52, −10, −6, −13, −20, −1, −17, +99, +53; total +4. No se probó recálculo interactivo en Excel.

**BLOCKED metodológico — categorías anexas a Leopold.** La hoja B de Don Franz incluye leyendas negativas con referencias 25/50/75 y en U7 escribe `> -75` para críticos, dirección que requiere aclaración si se lee como comparación algebraica de negativos. No se identificó allí fundamento para trasladar esas bandas a una suma de productos Leopold. Mantener los productos y ponderaciones de AMBIENTA como exploratorios, sin convertir el saldo en aprobación normativa. El [registro original USGS de 1971](https://www.usgs.gov/publications/a-procedure-evaluating-environmental-impact) caracteriza la matriz como resumen de los impactos significativos y sus importancias relativas. No establece en esa página bandas 25/50/75.

**FAIL de rotulado en plantilla ajena — Leopold SIGAMBIENTAL.** `Hoja1!BC3` anuncia promedios aritméticos, pero `BC11` suma productos de pares de valores sin dividir por un número de observaciones. Es una suma, no una media. No copiar esa etiqueta a AMBIENTA.

**BLOCKED de equivalencia entre variantes — PDF SIGAMBIENTAL.** La página 2 declara Conesa modificada. La página 5 muestra la cuarta edición, y la 6 atribuye la tabla a Conesa 2010 y la clasificación modificada a DREMC. La tabla añade niveles como RV=3 y MC=3, no presentes en el cuadro ordinario de la variante 1997 de AMBIENTA; asimismo presenta solapamiento en 75 entre dos categorías. Estas son diferencias comprobadas de material, no autorización para cambiar escalas históricas. La página 9 muestra ejemplos distintos de los del Excel descargado: tampoco debe suponerse identidad de datos entre ambos.

**NOT_RUN — respaldo externo de F2/F3 y Anejo 4.** Ninguno de estos archivos examina de manera suficiente la distribución de 1.000 UIP, el contraste SIN/CON, las curvas sintéticas F3b ni la fidelidad numérica del Anejo 4. Los PASS previos de DEMO-001 permanecen en el informe QA; no se reetiquetan como validados por YouTube.

## Continuidad y decisiones

1. Mantener la edición y variante visibles; documentar por separado cualquier propuesta basada en 2010 o en una adaptación docente.
2. Conservar los controles de fuente, indicador, unidad, ámbito y evidencia de F3. Las planillas revisadas no justifican retirarlos.
3. Mantener pendientes la sinergia por debilitamiento, la interpretación EX crítica / máximo 100 y la convención de calidad ambiental por estudio ya identificadas frente al libro original.
4. La revisión audiovisual íntegra queda BLOCKED hasta disponer de reproducción o transcripción verificables gratuitas. No atribuir conclusiones a fragmentos que solo aparecieron en resúmenes automáticos.
5. No se fusiona ni publica el PR por esta revisión. Persiste el HOLD de P0 por los dos incidentes históricos no reproducidos. El CI previo satisfactorio corresponde al código ya documentado; este añadido es exclusivamente documental.
