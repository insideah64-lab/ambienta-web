# AMBIENTA · Datos sintéticos para las demos Battelle-Columbus

Versión 1 · 4 de noviembre de 2026 · Paquete ambienta.battelle-training-pack.v1

**Uso: capacitación, carga manual, importación y prueba del software. Todos los valores nuevos y todas las funciones son sintéticos y no están validados ambientalmente. No usar como estudio de impacto, medición, pronóstico calibrado, evidencia de cumplimiento o evaluación de un proyecto real.**

## Qué se analizó y qué se creó

Se analizaron las dos fuentes del repositorio: web/domain.mjs::createDemoState() y apps/web/src/lib/diablillosDemo.mjs::createDiablillosState(). Se conservaron sus identificadores, impactos y vínculos impacto-medida. Se añadieron datos en archivos separados; no se modificaron las demos originales ni sus evaluaciones guardadas.

| Caso | Impactos | Programas | Medidas | Inspecciones | Evidencias | Hallazgos | Acciones correctivas |
|---|---:|---:|---:|---:|---:|---:|---:|
| DEMO-001 | 4 | 6 | 4 | 2 | 0 | 0 | 0 |
| DIAB-2026-DEMO | 4 | 4 | 4 | 2 | 6 | 1 | 1 |

Las inspecciones conformes y las referencias revisadas son indicadores de gestión documental: no se convirtieron en calidad de agua, aire, suelo o participación social. Las evidencias del caso Diablillos son simuladas; que algunas figuren como validadas en la demo no autentica estas nuevas cifras.

## Tres juegos con finalidades distintas

| Archivo JSON | Finalidad | Parámetros | UIP cubiertas | UIA SIN | UIA CON | ΔUIA | Resultado |
|---|---|---:|---:|---:|---:|---:|---|
| DEMO-001_Battelle_SINTETICO.json | Capacitación vinculada a la demo | 6/78 | 94/1000 | 78,7000 | 58,2800 | -20,4200 | Parcial; pendientes 72 parámetros |
| DIAB-2026-DEMO_Battelle_SINTETICO.json | Capacitación vinculada a la demo | 7/78 | 136/1000 | 112,4000 | 85,4000 | -27,0000 | Parcial; pendientes 71 parámetros |
| DEMO-001_Battelle_CONTROL_78_NO_EVALUACION.json | Control técnico sin significado ambiental | 78/78 | 1000/1000 | 500,0000 | 400,0000 | -100,0000 | Completo solo para probar operaciones |

Los dos escenarios de capacitación permanecen incompletos deliberadamente. No se asigna cero a los faltantes ni se los marca como no aplicables para conseguir un total. Los 78 parámetros del catálogo histórico deben revisarse por pertinencia antes de utilizarlos en Argentina; completar el control técnico no resuelve esa revisión.

## Cómo usar los archivos

1. Hacer una copia de seguridad: abrir Battelle y exportar el JSON del borrador existente.
2. Para Urbanización, abrir http://127.0.0.1:8787/v3/index.html#/matrices y seleccionar Battelle-Columbus.
3. Para Diablillos DEMO, abrir http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices y seleccionar Battelle-Columbus.
4. Usar «Importar JSON» con el archivo que tenga el mismo identificador de proyecto. Si existe un borrador, la aplicación pide confirmación y conserva un respaldo local del anterior. Un archivo de otro proyecto debe rechazarse.
5. Verificar contexto, parámetros calculables, UIP cubiertas, subtotal y banderas contra las tablas del informe. Elegir un parámetro para ver las mediciones y la curva.
6. Recargar realmente, volver a abrir Battelle y comprobar los resultados. Exportar JSON/CSV y leer los archivos descargados.
7. El control de 78 se usa únicamente en DEMO-001 y después del respaldo. Cambia el borrador activo de Battelle; no suma datos al caso Urbanización. Reimportar el JSON anterior para restaurarlo.

Los enlaces locales requieren que el servidor de esta sesión esté activo. Ninguna importación se realiza automáticamente en tu navegador personal. También se puede cargar a mano cada ficha con los valores de este informe. Los JSON contienen la documentación de todos los campos obligatorios.

## Convención didáctica y trazabilidad

Se conserva el perfil histórico battelle-ees-dee-1973-original, con 1000 UIP y categorías 240/402/153/205. No se redistribuyen los pesos. Ambos escenarios están rotulados «estimado». En los casos de capacitación, SIN y CON se comparan al horizonte hipotético 2030 y dentro del mismo ámbito ficticio. No se mezclan datos actuales observados con otra fecha futura.

Todas las curvas son propuestas didácticas de este informe. CA=1 identifica el extremo favorable y CA=0 el desfavorable de su dominio artificial. No existe correspondencia normativa: un nudo con CA=0,5 no es un máximo admisible. Los dominios y pendientes se escogieron para enseñar el cálculo y no por calibración de campo. La conversión solo es utilizable para esta simulación; su aplicación ambiental necesita revisión técnica y fuentes independientes.

La aplicación interpola linealmente entre los nudos, admite máximos interiores y bloquea extrapolación, abscisas repetidas y saltos. UIA SIN=CA SIN×UIP; UIA CON=CA CON×UIP; ΔUIA=CON−SIN. Los signos se derivan de la calidad, no de multiplicar otra vez por el signo del impacto de la demo.

### Regla para las banderas

Ecología: caída relativa entre 5% y 10%, ambos inclusive, bandera menor; más de 10%, mayor. Otras categorías: primero debe existir una caída absoluta de CA de al menos 0,1; entonces una caída relativa menor de 30% da bandera menor y de 30% o más da mayor. Un incremento no genera bandera de deterioro. Las banderas indican investigación y no rechazo legal. No se divide por cero. Un subtotal positivo no compensa ni borra banderas.

## URBANIZACION: escenario de capacitación

Proyecto de la demo: DEMO-001, Urbanización — expediente de ejemplo.

Ámbito nuevo: 100 ha inventadas, sin georreferencia. La vegetación natural ocupa 60/42 ha y está incluida dentro de 70/50 ha de hábitat permeable SIN/CON; no se suman esas superficies como categorías independientes. Se simula una alternativa de obra con deterioros de cobertura, suelo, polvo y escorrentía. No es la cuantificación de las cuatro medidas de gestión existentes.

### Datos de entrada y vínculo con la demo

| ID | Indicador SINTÉTICO | Unidad | SIN | CON | Impacto | Medida |
|---|---|---|---:|---:|---|---|
| bc-03 | Cobertura de vegetación natural | % de 100 ha ficticias | 60 | 42 | IMP-BIO-001 | MED-004 |
| bc-12 | Superficie de hábitat natural o permeable | % de 100 ha ficticias | 70 | 50 | IMP-BIO-001 | MED-004 |
| bc-28 | Desviación absoluta del caudal estacional de referencia | % | 10 | 30 | IMP-AGU-002 | MED-002 |
| bc-36 | PM10 representativo, promedio de 24 h hipotético | µg/m³ | 25 | 75 | IMP-AIR-003 | MED-003 |
| bc-40 | Superficie con alteración edáfica persistente | % de 100 ha ficticias | 5 | 20 | IMP-SUE-004 | MED-001 |
| bc-41 | Pérdida anual de suelo por erosión | t/ha/año | 2 | 8 | IMP-SUE-004 | MED-001 |

### Funciones propuestas y justificación de cada ficha

- **bc-03 · Terrestrial natural vegetation · 14 UIP.** Nudos (indicador;CA): 0;0 / 100;1. Área de 100 ha inventada: 60 ha SIN y 42 ha CON; no usa polígonos SIG.

- **bc-12 · Land use · 12 UIP.** Nudos (indicador;CA): 0;0 / 100;1. Hábitat permeable hipotético; incluye vegetación, no se suma a ella como área independiente.

- **bc-28 · Stream flow variation · 28 UIP.** Nudos (indicador;CA): 0;1 / 100;0. Índice hidrológico didáctico; no procede de modelo hidrológico ni de inspecciones de drenaje.

- **bc-36 · Particulate matter · 12 UIP.** Nudos (indicador;CA): 0;1 / 50;0.8 / 100;0.4 / 200;0. Concentración sintética. La curva no representa una norma ni una recomendación sanitaria.

- **bc-40 · Land use · 14 UIP.** Nudos (indicador;CA): 0;1 / 100;0. Capa hipotética de afectación del suelo; no se deduce del número de inspecciones conformes.

- **bc-41 · Soil erosion · 14 UIP.** Nudos (indicador;CA): 0;1 / 10;0.5 / 20;0. Tasa anual media inventada para entrenamiento; no es una estimación RUSLE ni un registro de campo.

### Resultados esperados, sin redondear durante el cálculo

| ID | UIP | CA SIN | CA CON | UIA SIN | UIA CON | ΔUIA | Bandera |
|---|---:|---:|---:|---:|---:|---:|---|
| bc-03 | 14 | 0,6000 | 0,4200 | 8,4000 | 5,8800 | -2,5200 | Mayor |
| bc-12 | 12 | 0,7000 | 0,5000 | 8,4000 | 6,0000 | -2,4000 | Mayor |
| bc-28 | 28 | 0,9000 | 0,7000 | 25,2000 | 19,6000 | -5,6000 | Menor |
| bc-36 | 12 | 0,9000 | 0,6000 | 10,8000 | 7,2000 | -3,6000 | Mayor |
| bc-40 | 14 | 0,9500 | 0,8000 | 13,3000 | 11,2000 | -2,1000 | Menor |
| bc-41 | 14 | 0,9000 | 0,6000 | 12,6000 | 8,4000 | -4,2000 | Mayor |
| SUBTOTAL PARCIAL | 94 | — | — | 78,7000 | 58,2800 | -20,4200 | 4 mayores / 2 menores |

Se calculan 6/78 parámetros; 72 quedan pendientes. Las UIP sin cubrir son 906; no se convierten en ceros ni se reparten. Las diferencias de último decimal son de representación; tolerancia de verificación numérica 1e-9 UIA.

## DIABLILLOS_DEMO: escenario de capacitación

Proyecto de la demo: DIAB-2026-DEMO, Diablillos — auditoría documental DEMO.

Ámbito nuevo: cuenca ficticia de 100 km², sin coordenadas ni correspondencia con Diablillos real. Se simulan presiones hídricas y edáficas y una mejora didáctica de diálogo. Los antecedentes públicos del fixture no se revalidaron ni se utilizaron como prueba de estos valores. No se atribuye contaminación, impacto medido, infracción ni desempeño social al proyecto real.

### Datos de entrada y vínculo con la demo

| ID | Indicador SINTÉTICO | Unidad | SIN | CON | Impacto | Medida |
|---|---|---|---:|---:|---|---|
| bc-19 | Pérdida de balance hídrico de referencia | % | 8 | 18 | IMP-D-AGU | MED-DIAB-001 |
| bc-27 | pH en punto ficticio de comparación | unidad de pH | 7.5 | 8.5 | IMP-D-EFL | MED-DIAB-002 |
| bc-29 | Desviación absoluta de temperatura de referencia | °C | 1 | 2 | IMP-D-EFL | MED-DIAB-002 |
| bc-30 | Sólidos disueltos totales en agua ficticia | mg/L | 300 | 600 | IMP-D-EFL | MED-DIAB-002 |
| bc-32 | Turbidez en agua ficticia | NTU | 5 | 20 | IMP-D-EFL | MED-DIAB-002 |
| bc-41 | Pérdida anual de suelo por erosión | t/ha/año | 2 | 5 | IMP-D-SUE | MED-DIAB-003 |
| bc-78 | Rúbrica didáctica de interacción y diálogo | puntos de rúbrica (0-10) | 5 | 7 | IMP-D-SOC | MED-DIAB-004 |

### Funciones propuestas y justificación de cada ficha

- **bc-19 · Basin hydrologic loss · 20 UIP.** Nudos (indicador;CA): 0;1 / 100;0. Balance sintético para una cuenca ficticia. No describe consumos ni impactos del proyecto real.

- **bc-27 · pH · 18 UIP.** Nudos (indicador;CA): 0;0 / 6.5;0.8 / 7.5;1 / 9;0.5 / 14;0. Máximo didáctico en 7,5, elegido para enseñar una función no monótona; no es óptimo ecológico validado ni límite legal.

- **bc-29 · Temperature · 28 UIP.** Nudos (indicador;CA): 0;1 / 5;0. Diferencia térmica inventada, no temperatura absoluta ni medición de un efluente.

- **bc-30 · Total dissolved solids · 25 UIP.** Nudos (indicador;CA): 0;1 / 1000;0. Datos sintéticos sin análisis químico, cadena de custodia ni equivalencia normativa.

- **bc-32 · Turbidity · 20 UIP.** Nudos (indicador;CA): 0;1 / 50;0. Datos inventados; la evidencia documental de la demo no contiene estos valores.

- **bc-41 · Soil erosion · 14 UIP.** Nudos (indicador;CA): 0;1 / 10;0.5 / 20;0. Tasa sintética, sin localización geográfica ni atribución de afectación real.

- **bc-78 · Social interactions · 11 UIP.** Nudos (indicador;CA): 0;0 / 10;1. Rúbrica inventada de cinco ítems 0-2; no se calcula desde referencias revisadas ni acredita participación real.

### Resultados esperados, sin redondear durante el cálculo

| ID | UIP | CA SIN | CA CON | UIA SIN | UIA CON | ΔUIA | Bandera |
|---|---:|---:|---:|---:|---:|---:|---|
| bc-19 | 20 | 0,9200 | 0,8200 | 18,4000 | 16,4000 | -2,0000 | Menor |
| bc-27 | 18 | 1,0000 | 0,6667 | 18,0000 | 12,0000 | -6,0000 | Mayor |
| bc-29 | 28 | 0,8000 | 0,6000 | 22,4000 | 16,8000 | -5,6000 | Menor |
| bc-30 | 25 | 0,7000 | 0,4000 | 17,5000 | 10,0000 | -7,5000 | Mayor |
| bc-32 | 20 | 0,9000 | 0,6000 | 18,0000 | 12,0000 | -6,0000 | Mayor |
| bc-41 | 14 | 0,9000 | 0,7500 | 12,6000 | 10,5000 | -2,1000 | Menor |
| bc-78 | 11 | 0,5000 | 0,7000 | 5,5000 | 7,7000 | 2,2000 | Sin bandera |
| SUBTOTAL PARCIAL | 136 | — | — | 112,4000 | 85,4000 | -27,0000 | 3 mayores / 3 menores |

Se calculan 7/78 parámetros; 71 quedan pendientes. Las UIP sin cubrir son 864; no se convierten en ceros ni se reparten. Las diferencias de último decimal son de representación; tolerancia de verificación numérica 1e-9 UIA.

### Rúbrica social inventada del caso Diablillos DEMO

Cinco ítems con rango 0–2. Para este ejercicio: 0=sin soporte ficticio, 1=soporte parcial ficticio, 2=soporte completo ficticio. Los puntos no proceden de documentos reales ni del contador de referencias revisadas de la demo. Es una propuesta pedagógica no validada como instrumento de ciencias sociales.

| Ítem | SIN | CON |
|---|---:|---:|
| Acceso a información comprensible | 1 | 2 |
| Oportunidad de diálogo | 1 | 1 |
| Respuesta y seguimiento | 1 | 2 |
| Inclusión de participantes | 1 | 1 |
| Continuidad de los espacios | 1 | 1 |
| TOTAL SINTÉTICO | 5 | 7 |

El aumento didáctico de +2,2 UIA de bc-78 no elimina las banderas hídricas y del suelo. Antes de usar una rúbrica real se deben definir población, instrumentos, escala, validación, consulta y revisión independiente.

## Control técnico de los 78 parámetros

No es un tercer escenario ambiental. Todos los identificadores reciben una señal técnica artificial de 50 puntos SIN y 40 CON y la recta CA=x/100. La unidad es «puntos técnicos QA (0–100)» incluso cuando el nombre histórico del parámetro menciona un proceso físico: **no es una función ambiental de ese proceso**.

Esperado: CA=0,5/0,4; cada ΔUIA=-0,1×UIP; UIA totales=500/400 y Δ=-100. Se esperan 18 banderas mayores de Ecología y 60 menores del resto, según las reglas del motor. Las 78 fichas y el texto de Ecosistemas completan solamente las comprobaciones formales de la aplicación. No representan suficiencia, pertinencia o validez ambiental.

## Revisión de suficiencia y próximos datos necesarios

Los casos de capacitación necesitan, para pasar a un estudio real: delimitación y receptores verificables; inventarios y estacionalidad; mediciones/estimaciones con incertidumbre; fuentes y cadena de custodia cuando corresponda; escenarios SIN/CON comparables; funciones calibradas para cada indicador y unidad; convención de calidad común; pertinencia del perfil y revisión por un equipo interdisciplinario. La ponderación histórica permanece identificada; una adaptación local requiere otro perfil justificado, no cambiar los 1000 UIP de forma silenciosa.

No se extrapolan las curvas de este paquete, no se trasladan porcentajes de gestión a calidad ambiental y no se infiere cumplimiento de estos puntajes. Leopold y Conesa conservan sus propios datos, escalas y cálculos.

## Validación reproducible

PASS: generador determinista, 13 fichas vinculadas a identificadores existentes, resultados numéricos de referencia especificados por ficha y subtotales comprobados. PASS: importación desde archivos en navegador limpio a 1366 y 1800 px para ambos casos y el control. PASS: recarga real, 12 descargas JSON/CSV leídas y sumas contrastadas; proyecto y otros módulos intactos; respaldo del escenario parcial al importar el control. Las capturas completas y ampliadas se revisan antes de entregar. El CI completo se referencia en el PR actualizado.

BLOCKED para evaluación ambiental real: faltan mediciones, calibración y revisión independiente. NOT_RUN: adecuación territorial/cultural del catálogo histórico, estudios de incertidumbre, validación ecológica/social de funciones y múltiples alternativas simultáneas. Ninguna de estas limitaciones se cierra con datos inventados.

Para regenerar: node v3/overrides/scripts/generate-battelle-demo-pack.mjs. Para comprobar la importación y los archivos reales: node apps/web-v3/scripts/battelle-demo-pack-smoke.mjs. El servidor local debe servir dist en 127.0.0.1:8787. El paquete conserva datos-informe.json, resultados-esperados.json, browser-results.json y un manifiesto SHA-256.

## Referencias y procedencia

- Fuente de los registros originales: web/domain.mjs y apps/web/src/lib/diablillosDemo.mjs del repositorio insideah64-lab/ambienta-web, base adf76beee6ff55842ea42dd5ca06113df7af2f2b. Las cifras físicas nuevas de este informe no están en esas fuentes.
- Método: Dee et al. (1973), ecuación de comparación, catálogo y banderas: https://ponce.sdsu.edu/dee_et_al_1973.pdf.
- Conesa Fernández-Vítora, edición 1997/reimpresión 2000 aportada por el usuario: sección 6.2.5, pp. impresas 66–69; introducción del Anejo 4, p. 253. Contraste y diferencia de criterios sobre pesos documentados previamente en 14_BATTELLE_INVESTIGACION_Y_PRIMERA_VERSION.md. Ninguna curva de este paquete se atribuye al libro.
- Autor de los supuestos: elaboración sintética de capacitación para AMBIENTA, 2026-11-04. Sin visita de campo, sin planillas externas y sin fuentes normativas para los nudos propuestos.
