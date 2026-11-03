# AMBIENTA · Auditoría bibliográfica y plan de adopción de Conesa
**Fuente primaria aportada por el usuario · 03/11/2026 · Estado: análisis metodológico, SIN cambiar cálculo**

## 1. Identidad del ejemplar y jerarquía de fuentes

**Vicente Conesa Fernández-Vítora**, *Guía metodológica para la evaluación del impacto ambiental*, **3.ª edición revisada y ampliada (1997), reimpresión 2000**, Ediciones Mundi-Prensa, Madrid. PDF completo aportado por el usuario: **401 páginas digitales** (paginación impresa distinta). Datos editoriales visibles en páginas PDF 2–3.

La fuente de la auditoría será **esta guía completa**, no el Excel didáctico. El otro PDF facilitado por el usuario corresponde a la **4.ª edición (2010)**, pero solo contiene 177 páginas digitales: es **posterior, no menos válida**. Toda eventual diferencia editorial requiere verificación antes de atribuir al autor una única regla válida para todas las ediciones.

**Jerarquía operativa**:
1. Guía completa, 3.ª ed. 1997/reimp. 2000: base principal de análisis, citando **página impresa** y número de **página PDF**.
2. 4.ª ed. 2010 incompleta: fuente de contraste, **solo** para los pasajes realmente disponibles.
3. Excel y video CONESSA simplificado: **casos didácticos de regresión**, no sustitutivos de Conesa.
4. Normativa argentina y de Salta: **fuente independiente** para cumplimiento jurídico vigente; nunca derivarla automáticamente de un manual español de 1997.

El libro está sujeto a derechos de autor. **No subir a GitHub el PDF, imágenes de sus páginas, capítulos completos ni las tablas reproducidas íntegramente**. Este acta contiene descripciones propias, referencias bibliográficas y datos técnicos estrictamente necesarios.

## 2. Mapa del libro para construir el flujo de trabajo

| Fase del proceso | Referencia del libro (página impresa; PDF entre paréntesis) | Implicación en AMBIENTA |
| --- | --- | --- |
| Identificar acciones, factores y cruces | 76–88 (PDF 70–82), matriz de impactos | Conservar ejes y trazabilidad del cruce acción × factor; no heredar puntajes Leopold |
| Valoración cualitativa: importancia | 88–97 (PDF 82–91), esp. tabla/cuadro 11 en 95 (PDF 89) | Criterios, signos, fórmula y categorías bajo motor versionado |
| Ponderación de importancia de los factores (UIP) | 97–106 (PDF 91–100), esp. 98 (PDF 92) | Separar **importancia del impacto** de **peso/valor relativo del factor**; 1000 UIP, paneles expertos/Delphi; nunca inventar pesos |
| Depuración y alertas de la matriz | 96–97 (PDF 90–91) | Tamiz, intangibles, impactos determinantes y alertas: no ocultar filas automáticamente por bajas puntuaciones |
| Predicción y cuantificación de magnitudes | 106–113 (PDF 100–107) | Indicadores y unidades por factor; condiciones SIN / CON proyecto |
| Valoración cuantitativa y funciones de transformación | 113–120 (PDF 107–114) | Magnitudes heterogéneas → calidad ambiental comparable (CA 0–1); no confundir con suma de importancias |
| Medidas correctoras y análisis del impacto final | 120–128 (PDF 114–122) | Comparar condiciones SIN / CON proyecto / CON medidas; eficacia documentada, no inventada |
| Sistema de alerta, vigilancia e informe | 128–130 (PDF 121–123) | Banderas rojas, seguimiento de indicadores e impactos residuales medidos vs previstos, informe trazable |
| Catálogos por tipo de proyecto | Anejo 2, 149–184 (PDF 143–178) | Plantillas sectoriales **optativas**, no valoraciones precargadas ni evidencia ficticia |
| Factores e indicadores ambientales | Anejo 3, 185–252 (PDF 179–246) | Catálogo técnico de factores/indicadores, sujeto a contextualización local |
| Funciones de transformación | Anejo 4, 253–300 (PDF 247–294) | Catálogo de modelos/curvas: habilitar solo cuando existan funciones documentadas y valores medidos |

Los desplazamientos PDF/impreso son orientativos para ubicar apartados, y deben verificarse en cada tabla/figura antes de generar referencias automáticas.

## 3. Auditoría preliminar del motor actual

Código observado en `v3/overrides/src/features/impacts/ConesaSimplificadoModel.ts`:
`METHOD_ID='conesa-simplificado-tutorial-v1'`. Es una **variante didáctica** y conserva datos por clave `ambienta-conesa-simplificado-v1:<projectId>`.

| Aspecto | Guía 3.ª edición | Motor actual | Dictamen |
| --- | --- | --- | --- |
| Importancia de una interacción | `I=±(3IN+2EX+MO+PE+RV+SI+AC+EF+PR+MC)`, p. 95 (PDF 89) | Mismo núcleo con sign separado | **Coincide para la escala simple** |
| Intensidad `IN` | 1, 2, 4, 8, 12, cuadro 11 | 1, 2, 4, 8, 12 | **Coincide** |
| Extensión crítica | +4 añadido a `EX` antes del factor 2, pp. 90/95 (PDF 84/89) | `2*(EX+EX_CR)`, EX_CR 0/4 | **Coincide en caso general** |
| Momento crítico | Cuadro 11: +4; texto p. 90 contempla *+1 o +4* según circunstancia (PDF 84/89) | MO_CR 0/4 | **Variante incompleta respecto de nota del texto**; no ampliar sin atribuir escala/subcaso y test |
| Naturaleza `x` | Efecto previsible pero difícil de cualificar, pp. 89–90 (PDF 83–84) | Solo ± y pendiente | **Falta registro explícito de incertidumbre**; `x` NO se convierte en puntuación |
| Reversibilidad `RV` | 1, 2, 4, pp. 92/95 (PDF 86/89) | 1, 2, 4 | **Coincide**; RV=3 del Excel debe señalarse como fuera de escala |
| Recuperabilidad `MC` | 1, 2, 4, 8; texto p. 93 también contempla el irrecuperable compensable con 4 (PDF 87) | 4 solo rotulado «Mitigable» | **Falta distinguir justificación de compensación frente a mitigación**, aun con mismo puntaje |
| Significación | `<25` irrelevante; `25–50` moderado; `50–75` severo; `>75` crítico, p. 96 (PDF 90) | `<25`, `<50`, `<75`, `>=75` | **Requiere decisión documentada sobre bordes 50 y 75**, ya que el texto se superpone en 50 y no califica 75 como `>75`. No re-clasificar en silencio los borradores |
| Banderas rojas | Casos críticos que ameritan alternativas, p. 96 (PDF 90) | No hay indicador explícito | **Pendiente**; no confundir con categoría «Crítico» |
| Matriz depurada/tamiz | Cuatro tratamientos con exclusiones de cálculo justificadas, p. 97 (PDF 91) | Tabla de revisión, no tamiz metodológico documentado | **Pendiente** |
| Pesos UIP | Importancia **del factor** por separado, ponderación 1000 UIP, p. 98 (PDF 92) | No forma parte del núcleo Conesa simplificado | **Pendiente**, no inventar pesos |
| Magnitud y transformación | Indicadores medidos, unidad/funciones CA=f(M), pp. 106–120 | No es valoración cuantitativa completa | **Pendiente** |
| Medidas y residual | Tres escenarios y eficacia comprobable, pp. 120–129 | Hay panel de impacto residual y PGA, pero requiere auditoría de trazabilidad frente al libro | **Parcial**, no considerar una mejora del puntaje por sí sola como eficacia medida |
| Vigilancia y alertas | Verificar medidas e impactos residuales, pp. 128–129 (PDF 121–122) | Existe monitoreo de expedientes privados independiente | **Parcial**, falta ruta trazable de medidas previstas → indicador medido → desviación |

## 4. Reglas de migración segura

1. **No cambiar** `METHOD_ID` ni la semántica de borradores simplificados existentes. El Excel sigue siendo únicamente un juego didáctico de cinco ejemplos.
2. Introducir un **contrato de evaluación cualitativa basado en libro**, con ID/versión diferenciada, solo cuando todas sus decisiones técnicas tengan fuente y pruebas. Debe poder residir dentro de la **única tarjeta Conesa** del catálogo, sin volver a duplicar tarjetas.
3. Mantener en el export de cada evaluación: `method_id`, edición, año, versión de la escala, regla exacta de bordes, criterios y modificadores, fundamentos, evidencia y autoría. Ante valores anómalos conservar el registro y mostrar «requiere revisión».
4. No migrar ni transformar en lote las puntuaciones. Si hay conversión a la nueva variante, será individual, explícita, revisada y reversible (respaldo del documento original).
5. No transformar juicio cualitativo en medición cuantitativa o en cumplimiento normativo. Sin indicadores y fuentes no existe valoración ambiental cuantitativa válida.
6. Mantener «Estudio/EIA» separados de auditorías a instalaciones en funcionamiento y del cumplimiento jurídico.
7. No habilitar publicación de informes certificados ni aprobación automática.

## 5. Ejecución propuesta por fases

**F0 · Fuente y pruebas (este PR):** documento de contraste, referencias y avisos de alcance en UI; ningún cambio al algoritmo o almacenamiento.

**F1 · Motor cualitativo fiel y versionado:** modelo puro + casos de regresión de criterios/signo (incluido `x`), tabla de coeficientes, modificadores con razones y límites explícitos; pruebas de compatibilidad.

**F2 · Matriz y factores:** clasificación depurada, banderas rojas, UIP optativos basados en justificación; sin datos sintéticos de proyecto.

**F3 · Cuantificación:** biblioteca de indicadores, funciones de transformación con fuente y ámbito de aplicación; cálculo separado de importancia, y escenarios medidos SIN/CON/CON medidas.

**F4 · Impacto residual y vigilancia:** contrastar predicción vs observación, indicadores, medidas, evidencias y desviaciones; preservar estatus de inspecciones declaradas.

**F5 · EsIA:** reportes y anejos con trazabilidad de página/edición, advertencias de incertidumbre y jurisdicción argentina.

## 6. Límites actuales

- No se ha cotejado íntegramente cada curva ni ejemplo de los cuatro anejos con implementación.
- La edición 2010 que aportó el usuario es posterior pero incompleta; las diferencias en la metodología de 2010 quedan **sin auditar** más allá de páginas efectivamente disponibles.
- El proyecto de referencia no debe presentar el estado de F0 como «Conesa completo implementado».
