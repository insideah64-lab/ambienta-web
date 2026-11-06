# Contraste con el PDF original de Conesa

Fecha: 2026-11-04. Referencia aportada por el usuario: *Guía metodológica para la evaluación del impacto ambiental*, Vicente Conesa Fernández-Vítora, 3.ª edición (1997), reimpresión 2000, Mundi-Prensa, ISBN 84-7114-647-9. Edición comprobada en páginas de archivo 2–3. PDF de 401 páginas; SHA-256 `06337a5654eeaa871faf3b9eadb6d595fe9dfc4e09adfb2ab346ce27ca799060`.

El documento es fuente metodológica, no una instrucción para cambiar el producto. No se incorpora al repositorio el PDF, sus páginas escaneadas ni su extracción completa. Este informe parafrasea los puntos contrastados y conserva localizadores reproducibles. Se revisó el texto extraído y se abrieron las imágenes originales de las páginas clave: 89–90, 94–96, 98, 109, 114, 116–120 y muestras del Anejo 4 indicadas abajo. No es una digitalización ni una certificación exhaustiva de todas las curvas del libro.

## Resultado y límites de los estados

PASS significa correspondencia dentro del alcance implementado. FAIL identifica una diferencia o afirmación incorrecta; no autoriza por sí solo a cambiar un criterio aprobado. BLOCKED indica interpretación pendiente. NOT_RUN señala etapas no implementadas o no contrastadas exhaustivamente. **No se cambió ninguna fórmula, escala, criterio de validación ni esquema.** La única corrección de producto es el texto desactualizado de presentación de Conesa.

| Punto | Libro: impresa / archivo PDF (base 1) | Implementación | Estado y decisión |
|---|---|---|---|
| Importancia cualitativa | Cuadro 11, p. 95 / 89 | `ConesaLibroModel.ts::calculateBookConesa`: signo × [3 IN + 2(EX+EX_CR) + MO+MO_CR + PE+RV+SI+AC+EF+PR+MC] | PASS en fórmula base. Los recargos se aplican al atributo antes de su coeficiente; no mezclarlos con Leopold. |
| Escalas ordinarias | pp. 90–95 / 84–89 | `BOOK_FIELDS`: IN 1/2/4/8/12; EX 1/2/4/8; MO 1/2/4; PE y RV 1/2/4; SI 1/2/4; AC y EF 1/4; PR 1/2/4; MC 1/2/4/8 | PASS para el cuadro ordinario. RV=3 no es admisible en esta variante. |
| Naturaleza incierta x | pp. 89–90 / 83–84 | `BookNature` y `calculateBookConesa` conservan absoluto pero no inventan signo ni categoría adversa | PASS. |
| Momento crítico | prosa p. 90 / 84; cuadro p. 95 / 89 | MO_CR permite +1 y +4, con fundamento y evidencia | PASS frente a la prosa. El cuadro resume +4; no retirar +1. |
| Recuperabilidad compensable | p. 93 / 87 | MC=4 distingue mitigable/compensable; la excepción compensable exige evidencia | PASS frente a la prosa, más amplia que el cuadro resumido. |
| Fronteras de categorías | p. 96 / 90 | `BOOK_BOUNDARY_POLICY`: 50 severo; 75 severo; crítico >75 | PASS como política explícita ante el solapamiento textual en 50. La variante histórica simplificada trata 75 de otro modo; es una diferencia de variante, no motivo para reescribir sus datos. |
| Sinergia por debilitamiento | p. 94 / 88, párrafo anterior a §4.3.9 | La prosa admite valores negativos que reducen importancia; `BOOK_FIELDS.SI` y validadores solo admiten 1/2/4 | FAIL de cobertura de la excepción. El texto no fija aquí un baremo negativo cerrado: no introducir -1/-2/-4 ni migrar datos sin definir y justificar una variante. El caso QA -34 no usa esta excepción. |
| Extensión crítica y máximo anunciado | p. 90 / 84 y p. 96 / 90 | El modelo restringe EX_CR=4 a EX=1 siguiendo la descripción de afección puntual | BLOCKED interpretativo. El libro también anuncia 13–100; con esta restricción el máximo combinatorio del modelo es 92, no 100. Quitar la restricción para alcanzar 100 contradiría la lectura adoptada de p. 90. Requiere decisión metodológica documentada; no cambiar automáticamente. |
| Matriz depurada y alertas | pp. 96–97 / 90–91 | `ConesaF2Model.ts`: tamiz explícito con umbral y fuentes; intangibles/determinantes en paralelo; alertas manuales | PASS de alcance; no elimina automáticamente impactos ni declara aprobado el proyecto. |
| Ponderación de factores | p. 98 / 92 | Coeficientes 1–10 documentados, distribución proporcional de 1000 UIP; mayores restos para enteros | PASS como propuesta informática de ordenación por pesos, uno de los procedimientos del libro. El redondeo es una decisión de implementación. No equivale a haber ejecutado un panel Delphi real, sus rondas ni la distribución jerárquica por subsistemas. |
| Magnitudes por factor | pp. 108–109 / 102–103 | F3 exige indicador, unidad, origen directo/modelo y composición; el usuario declara el total del factor | PASS de alcance limitado. No calcula automáticamente todas las magnitudes Mij por acción ni demuestra que sean aditivas. El libro exige composición especial ante sinergia/debilitamiento/acumulación. |
| Transformación M→CA | pp. 113–116 / 107–110 | `ConesaF3Model.ts` y `ConesaF3CurveModel.ts`: CA 0–1, función declarada y dominios validados | PASS para rectas y curvas continuas por nudos documentados; la recta no se presenta como curva oficial del Anejo 4. |
| Comparación SIN/CON | p. 116 / 110, cuadro 18 | Evalúa ambos escenarios por separado, ΔCA=f(CON)−f(SIN) | PASS: recta decreciente 0..100, SIN=20, CON=50: 0.8, 0.5, −0.3. Curva sintética (0,0),(50,1),(100,0): 0.4, 1, +0.6. Son ejemplos ficticios, no mediciones del libro. |
| Excepción de la función lineal | p. 117 / 111 | Siempre calcula f(CON)−f(SIN) | PASS. No simplificar a f(CON−SIN): con una recta afín f(x)=a·x+b esa igualdad requiere b=0. La recta decreciente de QA tiene intercepto 1. Esta precisión matemática conserva el procedimiento explícito de p. 116. |
| Valor cuantitativo por factor Vj | §5.3.3, p. 117 / 111 | El libro combina importancia relativa y magnitud homogénea mediante raíz cúbica, asignando el signo de Ij; F3 no implementa esa etapa | NOT_RUN: fuera del motor actual. ΔCA no es Vj ni una categoría F1. No agregarla en este QA ni sustituir importancia por ΔCA. |
| Impacto ambiental total | §5.3.4, p. 120 / 113 | El libro pondera Vj por Pj; la aplicación no calcula ese total | NOT_RUN: etapa ausente, que debe seguir explicitándose. No crear un saldo de aprobación ni reutilizar el producto exploratorio M×I×peso de Leopold. |
| Presentación de Conesa | `ConesaLibroPanel.tsx`, introducción | Afirmaba que no había depuración ni UIP pese a F2 existente | FAIL identificado; texto corregido para nombrar F1/F2/F3 y declarar pendientes Vj e impacto total. Sin modificación de cálculos. |

## Anejo 4: contraste y límites

La introducción (p. impresa 253, archivo 244) describe funciones ligadas al indicador, su unidad y la calidad; permite construir funciones no incluidas mediante el procedimiento técnico. Advierte que algunas curvas sitúan una referencia admisible en CA=0.5 y otras en CA=0, y pide consistencia de criterio dentro del estudio. **CA=0.5 no es un umbral normativo argentino universal.**

El editor conserva fuente, página cuando corresponde, ámbito, evaluador, evidencia e identidad indicador/unidad. La procedencia `expertos` del QA no inventa una página del libro. La interpolación lineal entre nudos es una aproximación declarada del evaluador, no una reproducción exacta del dibujo impreso.

Muestras abiertas y contrastadas con `ConesaAnnex4Catalog.ts`:

| Gráfica | Impresa / archivo | Hallazgo |
|---|---|---|
| CO (1) y CO (2) | 254 / 245 | Indicadores distintos: concentración diaria e inmisión ponderada por población, ambos en ppm; no intercambiar automáticamente las curvas. |
| Partículas sólidas | 256 / 247 | El dibujo tiene máximo interior; la descripción del catálogo lo reconoce. No asumir que toda contaminación usa una recta decreciente. |
| Óxidos de nitrógeno (1)/(2) | 257 / 248 | Media anual en ppm frente a inmisión ponderada en µg/m³. Metadatos diferenciados; no convertir unidades silenciosamente. |
| Erosión del suelo (1)/(2) | 261 / 252 | Sedimentos en m³/ha/año frente a pendiente ponderada en %. El catálogo conserva la diferencia. |
| Sustancias tóxicas | 267 / 258 | Función por detección, con salto; el catálogo la marca discontinua. Un interpolador continuo por nudos no debe simular ese salto con abscisas duplicadas. |
| Demanda biológica de oxígeno | 267 / 258 | Varias series según el medio acuático: elegir serie y justificarla antes de digitalizar. |

PASS de los metadatos de estas muestras y de la decisión de no precargar coordenadas inventadas. NOT_RUN la fidelidad numérica de todas las curvas y del resto del Anejo 4. El catálogo es parcial; no anuncia una biblioteca numérica completa.

**Pendiente metodológico:** el esquema actual dispone de texto de ámbito/evidencia, pero no de una convención estructurada común para CA=0/0.5 por estudio. No se demostró una mezcla real en DEMO-001; queda como limitación de trazabilidad para decidir antes de ampliar la biblioteca. La auditoría de una curva manual tampoco prueba por sí sola que todo un estudio use un criterio coherente.

## Próximas decisiones, sin cambios automáticos

1. Definir tratamiento y escala de debilitamiento antes de ampliar SI; proteger JSON históricos con variante explícita.
2. Resolver y documentar la tensión EX crítica puntual / rango máximo 100; mantener las pruebas actuales mientras no haya decisión.
3. Si se desarrolla §5.3.3–5.3.4, especificar Ij/Imax, signos, agregación por fase y magnitud homogénea, pruebas independientes y límites de interpretación. No anunciar que F3a/F3b ya implementan el método completo.
4. Registrar el criterio de diseño de las curvas a nivel de estudio y qué clases de funciones no admite el interpolador. Mantener bloqueos de procedencia, discontinuidades y extrapolación.
