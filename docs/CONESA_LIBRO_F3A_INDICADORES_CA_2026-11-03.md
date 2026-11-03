# AMBIENTA — Conesa 1997 F3a: indicadores y escenarios CA

**Estado: experimental, no fusionar sin CI verde y revisión de navegador.**

## Fuente y límites

Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, 3.ª edición (1997), reimpresión de 2000, pp. impresas 107–116 (PDF aprox. 101–110).

- §5.2.1 pp. 108–109: indicadores y unidades; medición directa e indirecta.
- §5.2.2 pp. 108–112: magnitudes heterogéneas, composición y sinergias, no sumar unidades ajenas.
- §5.3.1 pp. 113–116: calidad ambiental CA en [0,1] por función documentada.
- §5.3.2 p. 116: CA neta = CA CON − CA SIN = f(M CON) − f(M SIN); NO f(M CON − M SIN).

## Incremento F3a

Se integra en la tarjeta única Conesa tras F2. Tiene almacenamiento independiente, borrador JSON versionado y editor por factor con indicador, unidad, fuente, fecha, medición/predicción, explicación de composición, dominio y dirección de la función. Calcula CA SIN, CA CON y delta CA, sin extrapolar.

La primera función habilitada es una **recta explícitamente declarada** y justificada por el evaluador; nunca se sugiere que toda función del Anejo 4 sea lineal. No hay curvas predeterminadas, números de ejemplo prefijados, puntajes F1 modificados ni UIP inventadas.

No se calcula todavía Vj, IAj, 1000 UA, total de proyecto o eficacia de medidas. Las alertas F2 y factores intangibles/determinantes mantienen análisis separado. Se conserva JSON local malformado sin sobrescritura y se ofrecen exportaciones CSV/JSON.

## Próximo desarrollo

F3b: verificar y parametrizar las funciones originales del Anejo 4 con ámbito, fuente y dominio. F3c: enlazar formalmente la matriz depurada F2, importancia F1, UIP y la ecuación Vj del §5.3.3; considerar composición no aditiva, impactos temporales y signos sin presunciones.

La valoración cuantitativa final requiere datos ambientales reales, funciones validadas y revisión profesional.
