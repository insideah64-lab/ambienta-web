# AMBIENTA · F2 Conesa 1997 — Matriz depurada, banderas rojas y UIP

**Estado: implementación experimental propuesta en PR, 03/11/2026.** No sustituye la revisión ambiental profesional, ni certifica un EsIA ni acredita la existencia de un panel de expertos.

## Fuente principal

Vicente Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, 3.ª ed. revisada y ampliada (1997), reimp. 2000. Ejemplar aportado por el usuario, 401 páginas PDF. Secciones relevantes:
- **4.3.13** (p. impresa 96, PDF 90): alertas o *banderas rojas* en impactos importantes o localizados en lugares/momentos críticos y de difícil/imposible corrección; motivan análisis de alternativas del proyecto.
- **4.3.14** (p. 96–97, PDF 90–91): depuración mediante cuatro tratamientos diferenciados: efectos despreciables por tamiz, intangibles sin indicador representativo, determinantes con examen paralelo y efectos normales que integran la matriz de cálculo.
- **4.4.1** (p. 97–100, PDF 91–94): importancia del factor `!=` importancia del impacto; asignación documentada y proporcionada de **1.000 UIP** entre factores, mediante ponderaciones obtenidas de consultas y paneles expertos, por ejemplo escalas de pesos 1–10 o procesos tipo Delphi.
- **4.4.2** (p. 100–101, PDF 94–95): diferencias entre importancia absoluta y relativa, y cautela frente a sumar resultados cualitativos sin considerar procedencia y alcance.

No se incorporan páginas ni reproducciones completas de material protegido por derechos de autor al repositorio.

## Implementación

**Ruta**: Matrices → Conesa → Según libro · Conesa 1997 (experimental) → F2 (abajo del editor y de la revisión F1).

**Modelo F2**: `ConesaF2Model.ts` con ID `conesa-libro-1997-f2`, esquema `ambienta.conesa-libro-1997.dep-uip.f2` y almacenamiento local `ambienta-conesa-libro-1997-f2:<projectId>`.

### 1. Matriz depurada

Para cada cruce F1 registrado se puede elegir y fundamentar:
- `normal`: queda en el conjunto de cálculo; debe tener una valoración F1 válida y signo definido.
- `tamiz`: excluido tras *decisión explícita*, importancia absoluta estrictamente menor que un umbral documentado, fundamento de la decisión y evidencia. Sin umbral válido no hay exclusión automática.
- `intangible`: fuera del cálculo homogéneo, **permanece visible y documentado** para decisión paralela. Puede no contar con un indicador cuantificable.
- `determinante`: fuera del cálculo homogéneo, **permanece visible y documentado** para valoración decisiva y alternativas.

La interfaz no convierte puntuaciones F1 en una categoría de depuración; exige la selección expresa. No considera la matriz completa por tener solo una parte de los cruces documentados. Las decisiones de cruces eliminados de los ejes se conservan con advertencia de orfandad.

### 2. Banderas rojas

El evaluador activa una bandera roja **manualmente**, la justifica y cita evidencia. El motor solo acepta una bandera como validada cuando la interacción F1 es adversa y evaluada. Se puede dejar la alternativa todavía sin proponer y registrar esta ausencia sin inventarla. El indicador de banderas declaradas es un **conteo de señales registradas**, no un conteo de alternativas aprobadas ni de correcciones implementadas.

### 3. UIP propuestas

El libro requiere asignar **1.000 unidades** a la totalidad de factores. F2 permite ingresar coeficientes de ponderación **1–10** por factor solo junto a identificación y alcance del panel/persona responsable, acta documental y fecha. El modelo `proposeUIP` muestra la distribución por factores, con asignación de enteros por restos mayores y desempate estable (1000 exactos). Esta es una **conversión aritmética de los coeficientes declarados**, **no** una afirmación de consenso, de Delphi verificado o de peso experto aprobado.

**Bloqueos**: si falta cualquier factor o procedencia; aparecen IDs extra, fecha inválida, escala no permitida o ausencia de factores, no se calcula UIP. No se precarga ningún coeficiente. F2 todavía **no calcula** un total relativo de importancia del proyecto ni la cuantificación ambiental final: hacerlo exigiría auditar el procedimiento completo y fases temporales de las pp. 100–120.

## Compatibilidad y protección de datos

- F1: `ambienta-conesa-libro-1997-f1:<projectId>` queda intacto, y F2 solo recibe sus evaluaciones como **entrada de lectura**.
- F2: `ambienta-conesa-libro-1997-f2:<projectId>`, estado y formulario independientes; abrir F2 vacío no crea ningún documento.
- Los motores Excel y 1997 legado mantienen sus claves, fórmulas, exportaciones, enlaces con el PGA y el informe previo.
- Si un documento F2 no supera validación/JSON: no se reemplaza, no se habilitan escrituras y puede descargarse **el texto original sin modificación**.
- Exportación CSV y JSON con procedencia y versiones. Los campos de usuario se protegen contra ejecución como fórmulas de hoja de cálculo.
- No hay migración, cambios en Supabase ni en los datos del caso didáctico Diablillos.

## Pruebas

`tests/react-v3/conesa-libro-f2.test.mjs`: 1000 UIP exactos, ausencia de reparto incompleto, auditoría de datos, tamiz estricto, categorías paralelas, bandera roja voluntaria y orfandad.

`v3/overrides/scripts/conesa-libro-f2-smoke.mjs`: escritorio 1366/1800, una tarjeta Conesa, F1=28 intacto, F2 tamiz=30 con actas, bandera roja documentada, ponderación declarada 1–10, UIP=1000, exportación JSON/CSV y persistencia, recuperación de documento F2 malformado sin modificarlo.

En el workflow `v3-preview.yml` se ejecuta el nuevo smoke con los ya existentes, incluido F1, preservando hashes de V1/V2. Las capturas se adjuntan bajo `ambienta-conesa-libro-f2`. **No fusionar sin CI completamente verde.**

## Continuidad F3–F5

Sigue pendiente implementar valoración cuantitativa con **indicadores medidos, unidades, fuentes, funciones de transformación y escenarios sin/con proyecto**. La ponderación UIP de F2 no convierte importancia cualitativa en una predicción o en una medición de calidad ambiental.
