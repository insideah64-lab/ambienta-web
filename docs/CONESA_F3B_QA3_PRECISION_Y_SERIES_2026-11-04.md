# AMBIENTA · Conesa F3b-QA3 — precisión visual, sensibilidad por píxel y series separadas

**Fecha:** 2026-11-04. **Fuente del enfoque bibliográfico:** Vicente Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, 3.ª ed. (1997), reimpresión de 2000, Anejo 4. Esta implementación continúa F3b-QA1 (#69) y QA2 (#70), pero **no digitaliza automáticamente figuras del libro**, no determina la validez de una curva y no convierte registros en normas vigentes.

## Alcance implementado

1. **Ampliación 1×, 2×, 4× y 8×** del recorte local, con flechas de desplazamiento en cuatro direcciones y control para volver al centro. La vista utiliza `viewBox` SVG en **coordenadas de la imagen original**, no escalado arbitrario de datos. Las marcas capturadas conservan los píxeles fuente; ampliar no transforma M ni CA. `getScreenCTM().inverse()` mantiene la lectura de clic en coordenadas del documento gráfico.
2. **Sensibilidad de selección por píxel:** el operador declara un radio supuesto de ±0,5, ±1, ±2 o ±3 píxeles originales. Para una calibración lineal entre marcas originales, AMBIENTA muestra `±ΔM=radio·|ΔM_eje/Δpx_X|` y `±ΔCA=radio·|ΔCA_eje/Δpx_Y|`. La cifra indica el efecto de una imprecisión de puntero dada, **no** un intervalo estadístico, desviación estándar ni incertidumbre total. No incluye incertidumbres de marcas originales, grosor del trazo, baja resolución, distorsión de escaneo, interpolación o medición del indicador.
3. **Separación de trazados:** un modo específico permite identificar una o varias curvas continuas por nombre y conservar cada serie temporalmente por separado con sus coordenadas de imagen, nudos transformados y radio supuesto. El expediente exporta un JSON con las distintas series, imagen original identificada solo por su nombre y calibración. **No contiene la imagen, firma, certificado ni aprobación**.
4. **Protección del motor F3b:** al elegir modo varias series, desaparece la acción «Pasar puntos a lectura A/B». Las series no se incorporan al motor monoserie ni a la auditoría QA1, que no puede asignar una aprobación conjunta a varias curvas. El sistema no busca cuál sería la curva «correcta».
5. **Invalidación de borradores temporales:** cualquier cambio de marcas o valores de calibración elimina los puntos temporales y series de esa sesión, pero no modifica la curva F3b ni las lecturas A/B ya guardadas. Cambiar de imagen borra los datos de calibración de píxel y las series temporales. Las series solo existen mientras el componente permanece montado; se exportan por decisión expresa antes de cerrar.

## Limitaciones deliberadas

- No se aceptan saltos, escalas logarítmicas ni categorías como si fueran curvas continuas.
- Para gráficos de varias series, el JSON representa **trazados separados observados**; el motor no efectúa comparaciones de impacto ni infiere condiciones a partir de color.
- No se guarda el archivo original en el navegador ni se sube a servidores; para reproducir una reconstrucción, el evaluador debe preservar el raster o escaneo asociado y su contexto bibliográfico.
- No se modela correlación de errores entre ejes, incertidumbre de calibración ni error de interpretación humana. **No presentar ±Δ como incertidumbre expandida o banda de confianza**.
- Los puntos exportados se ordenan por M y las coordenadas fuente permanecen alineadas con cada nudo.
- Las 27 fichas bibliográficas del Anejo 4 continúan **pendientes de digitalización y revisión profesional**.

## Controles automatizados

- `tests/react-v3/conesa-f3b-precision.test.mjs`: transformaciones de vista, límites del desplazamiento, sensibilidad por píxel sin falsa precisión y exportación separada con correspondencia entre M/CA y píxel fuente.
- `v3/overrides/scripts/conesa-f3b-visual-smoke.mjs`: ampliado con zoom 2×, desplazamiento, radio de selección, dos series nombradas, exportación JSON, conservación de F3b y descarte de series por recalibración. Se conserva la prueba QA2 completa para 1366 y 1800 px y la ausencia de persistencia de imágenes.
- La pantalla utiliza React y CSS actuales. Se consultaron los contratos de Lumen UI para controles accesibles; el paquete **no forma parte de las dependencias de AMBIENTA** y no se introdujo una migración de diseño ajena a QA3.

## Siguiente iteración controlada

Modelar la identificación de una función concreta para cada serie (funciones condicionales), recorte con imagen/evidencia vinculada criptográficamente, estimación de incertidumbre metrológica y revisión profesional verificable. Solo después permitir versiones numéricas reutilizables con su trazabilidad y adecuación local. F3c permanece fuera de QA3.

**Restricción de publicación:** fusionar únicamente con compilación, pruebas numéricas, E2E y verificación de integridad V1/V2/V3 aprobadas.
