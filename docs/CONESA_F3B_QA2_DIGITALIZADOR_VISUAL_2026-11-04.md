# AMBIENTA · Conesa F3b-QA2 — digitalizador visual manual

**Fecha:** 2026-11-04. **Estado:** implementación experimental; sujeto a CI y prueba de navegador. Se basa en las fichas del Anejo 4 ya registradas por F3b, sin atribuir puntos gráficos no verificados al libro.

## Objetivo y continuidad

F3b-QA1 (PR #69) permite registrar calibración y dos lecturas manuales, discrepancias y revisión. QA2 añade una **superficie gráfica de capturas por clic** para aliviar la transcripción de coordenadas de imágenes raster aportadas por el operador. Los datos de F1, F2, F3a y el motor F3b permanecen independientes.

La entrada admite imágenes **PNG, JPEG y WebP**, de hasta **15 MB** y dimensiones por eje de **32 a 12000 píxeles**. La imagen se lee localmente como `blob:` para dibujar un SVG con superposición de marcas; **no se almacena en localStorage ni se sube a un servidor**. Al recargar se requiere seleccionarla otra vez. La referencia de archivo fuente original y su conservación siguen siendo responsabilidad del evaluador.

## Flujo

1. Matrices → Conesa → Según libro → F3b → Auditoría de digitalización. Seleccionar una ficha del Anejo 4 y un archivo de recorte correspondiente al mismo gráfico.
2. Completar en la calibración los **valores numéricos** de los dos extremos o marcas del eje X, más los dos de Y (CA). Con el digitalizador visual, marcar secuencialmente sus **píxeles reales** X1, X2, Y1, Y2. Se usa la dimensión original, no la pantalla CSS escalada.
3. Elegir «Capturar nudos» y marcar entre 2 y 24 nudos de **una sola curva continua**. El motor convierte el punto del SVG al sistema de coordenadas de la imagen y aplica interpolación lineal de los ejes calibrados: `valor = v0 + (pixel-p0)·(v1-v0)/(p1-p0)`.
4. Se bloquean puntos fuera del tramo calibrado y CA fuera de 0–1, imágenes inválidas, escalas no lineales y lecturas con abscisas repetidas. La vista de tabla conserva la precisión interna; el redondeo a cinco decimales es **solo para pantalla**.
5. Seleccionar «Lector A» o «Lector B» y transferir los puntos capturados **solo a esa lectura**, dejando la otra intacta. Cambiar de lector descarta la selección temporal y obliga a un nuevo conjunto de puntos.
6. El traspaso **nunca modifica los nudos F3b**; estos deben ingresarse/adoptarse conscientemente en su editor. QA1 coteja el resultado con ambas lecturas y exige un tercero revisor.
7. Al cambiar de archivo se descartan los puntos temporales y las marcas de píxel de calibración, con invalidación de revisión previa; las lecturas escritas A/B se conservan para que el usuario decida si reutilizarlas o reemplazarlas explícitamente. Antes de sustituir una lectura no vacía se solicita confirmación.

## Seguridad metodológica

- No hay extracción automática de líneas ni digitalización certificada.
- El programa no reconoce etiquetas de escala, no soporta escala logarítmica, discontinuidades, gráficos por categorías ni múltiples series como una sola curva. Deben quedar pendientes de modelos especiales.
- El mapa de coordenadas se usa dentro del rango entre las marcas de calibración; **sin extrapolación**.
- El control QA1 de diferencias **absolutas máximas** sigue separado de la estimación de incertidumbre estadística, que permanece pendiente.
- No se importan puntos desde imágenes del libro como curvas oficiales; ningún expediente habilita automáticamente funciones reutilizables para otros proyectos o jurisdicciones.
- En caso de operar con teclado, el formulario de coordenadas manuales permite señalar píxeles sin usar el puntero. Los valores M;CA también pueden ingresarse directamente en las lecturas A/B existentes.
- El componente se mantiene en React y CSS actuales. Lumen UI fue consultado para diseño de controles, contraste y estados, pero **no instalado** porque la aplicación no depende de su paquete y esta fase no justifica una migración de diseño.

## Archivos

- `ConesaF3VisualDigitizerModel.ts`: transformación y validación numérica.
- `ConesaF3VisualDigitizer.tsx`: imagen local, controles, SVG, captura por clic/teclado y transferencia explícita por lector.
- `ConesaF3VisualDigitizer.css`: presentación y accesibilidad de controles.
- `ConesaF3DigitizationAudit.tsx`: integración en QA1.
- `tests/react-v3/conesa-f3b-visual-digitizer.test.mjs`: pruebas de dominio, coordenadas, calibración invertida y errores.
- `v3/overrides/scripts/conesa-f3b-visual-smoke.mjs`: test Chromium a 1366 y 1800px, imagen PNG sintética, calibración de cuatro marcas, captura A/B, ausencia de mutación F3b y de persistencia de imagen.

## Próximas etapas

1. Análisis de escala logarítmica con contrato matemático independiente y tests específicos.
2. Múltiples series e identificación de curvas por condición.
3. Archivos de evidencia con hashes criptográficos y adjuntos persistidos de forma explícita y segura.
4. Registro de incertidumbre de píxel y sistema de auditoría profesional verificable.
5. Solo tras esas verificaciones considerar una biblioteca de funciones numéricas reutilizables y F3c.
