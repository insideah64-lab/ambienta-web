# 14 · Battelle-Columbus: contraste y primera versión

Fecha: 2026-11-04. Rama nueva: feature/battelle-columbus-2026-11-04. Base verificada: fb29ec73a378b6df6549fec70eb9275b4acd5d95 (constructor PC del PR #85). El PR de Battelle se dirige a esa rama para separar esta ampliación del trabajo previo. No se modifica main ni se publica.

PR de revisión: https://github.com/insideah64-lab/ambienta-web/pull/86. Commits de código: `c9b72319da5f5dea61e981fc9c06b21d405eee81` (perfil, motor, pantalla, pruebas y CI) y `1ad3eb9dadc4dbb2aedf0aac0a0981f22a3d8e20` (filtro y ficha sincronizados, sin crear ni reescribir mediciones). Los checks del PR identifican el commit documental final validado.

## Fuentes y alcance real de la investigación

Se revisaron las páginas completas del PDF aportado de Conesa, 3.ª edición 1997, reimpresión 2000: sección 6.2.5, impresas 66–69 / archivo 61–64. Se renderizaron y abrieron los cuadros 4 y 5 (archivo 62–63) y la explicación de la página 69 (archivo 64). El PDF y las páginas escaneadas no se incorporan al repositorio. Anejo 4, introducción impresa 253 / archivo 244, ya contrastado: las funciones necesitan identidad de indicador/unidad y una convención de calidad consistente; no son umbrales argentinos universales.

Fuente primaria adicional: [Dee et al. (1973), An environmental evaluation system for water resource planning](https://ponce.sdsu.edu/dee_et_al_1973.pdf), Water Resources Research 9(3), 523–535. Se abrieron las páginas de archivo 4, 5 y 10: ecuación (1), figura 3 y reglas de banderas en p. 532. Como comprobación del inventario se consultó la [tabla académica de Victor M. Ponce, SDSU](https://ponce.sdsu.edu/the_battelle_ees.html). La figura original confirma cuatro categorías con presupuestos 240/402/153/205 UIP, 78 parámetros numéricos y 18 componentes, uno de los cuales, Ecosistemas, es descriptivo. Los 17 componentes cuantitativos suman 1000 UIP.

**Discrepancia identificada antes de implementar:** la p. 526 del artículo busca mantener los pesos entre proyectos para reproducibilidad; Conesa p. 69 contempla revisar su asignación para el estudio. Se elige un perfil histórico explícito, con pesos originales inmutables. No se resuelve esa diferencia cambiando criterios aprobados de Conesa ni usando su F2. Una adaptación local necesitará otro perfil/versionado, justificación y revisión técnica. Las denominaciones históricas inglesas se conservan para identificar la fuente; no se presenta su clasificación cultural como una taxonomía argentina vigente.

## YouTube gratuito: qué pudo y qué no pudo revisarse

Se buscó desde la página pública de resultados y se consultaron metadatos/descripciones de cinco videos:

- [Sustentando Ando: Matriz Método de Batelle Columbus](https://www.youtube.com/watch?v=WUHVZ-jpi50): descripción consultada, sin enlace de descarga. Se abrió el reproductor y se intentaron escenas a 130/300/460 s. Las escenas no llegaron a estado reproducible; transcripción pública vacía, get_transcript HTTP 400 y timedtext HTTP 200 sin contenido.
- [Marcela Murcia: Metodología Batelle Columbus](https://www.youtube.com/watch?v=gmWmAnjkgJg): descripción vacía. Intentos de escenas a 60/180/300 s, sin reproducción verificable después de la publicidad.
- [Moisés Santos Andrade: Ejemplo Matriz Batelle Columbus](https://www.youtube.com/watch?v=DoP-hq6qpK4): descripción vacía. Los primeros fotogramas eran publicidad y se descartaron como evidencia. Tras usar el botón normal de saltar anuncio, las escenas a 90/240/420 s quedaron en buffering.
- [Green Progress: herramienta en Excel](https://www.youtube.com/watch?v=a7GKSbdnEFo): descripción consultada, anuncia demostración pero no contiene enlace a planilla. No se adquirió el producto comercial encontrado en la búsqueda web.
- [Flor Pinto: Metodología de Battelle Columbus](https://www.youtube.com/watch?v=YARjbCJhsyI): descripción vacía.

PASS: búsqueda y revisión de descripciones/enlaces. BLOCKED: contraste audiovisual completo y transcripciones. No se afirma haber visto el contenido completo ni se atribuyen a estos videos fórmulas o errores que no pudieron observarse. No se encontró una planilla descargable gratuita en esas cinco descripciones. No se usaron TinyFish, vidIQ, créditos ni compras. El navegador integrado informó indisponibilidad; se continuó con Chromium/Playwright gratuito, sin sesión personal.

## Implementación y contrato técnico

Una tabla por estudio de 78 parámetros, filtro por categoría, subtotales identificados como parciales, ficha seleccionada y un SVG con función y posiciones SIN/CON. React es dueño del DOM; hasta 100 nudos por función, sin animación ni biblioteca gráfica añadida. El foco, los encabezados y los valores no dependen de hover. La tabla conserva su scroll dentro de la página a 1366/1800 px. Móvil está fuera del alcance solicitado.

El contexto incluye alternativa, horizonte común y ámbito. Cada parámetro registra indicador, unidad, mediciones SIN/CON, procedencia medida/estimada, fuentes de ambos escenarios, nudos, fuente/localizador/ámbito de la curva, convención de calidad y evaluador. Se interpola linealmente por tramos; no se extrapola ni se aceptan saltos o abscisas duplicadas. No se precargan coordenadas del libro ni se copian curvas, puntuaciones o UIP desde otros motores.

Cálculo independiente: UIA SIN = CA SIN × UIP; UIA CON = CA CON × UIP; ΔUIA = CON − SIN. Los faltantes no cuentan como cero ni redistribuyen sus pesos. El total completo exige los 78 parámetros y descripción de Ecosistemas. Las banderas no se compensan ni implican rechazo legal: Ecología, pérdida relativa 5–10% inclusive menor, >10% mayor; otras categorías, pérdida absoluta ≥0,1 y relativa <30% menor / ≥30% mayor. Se controla división por cero y fronteras con tolerancia numérica de 1e-10. Datos pendientes aparecen como lagunas, sin afirmar una bandera cuantitativa calculada.

Almacenamiento independiente por proyecto: ambiente-battelle se implementa con la clave exacta `ambienta-battelle-v1:<projectId>`, esquema `ambienta.battelle.v1`, perfil `battelle-ees-dee-1973-original`. Abrir la herramienta no crea valores ni escribe un documento vacío. Se guardan borradores modificados; JSON/CSV contienen procedencia. La importación valida proyecto/perfil/esquema, recalcula resultados y conserva una copia del borrador anterior tras confirmación. Archivos locales inválidos permanecen intactos y bloquean edición, con descarga del texto original. El método activo vuelve al selector inicial tras recarga como los otros motores; los datos de Battelle se recuperan al abrirlo.

## Resultados y continuidad

- PASS: build y TypeScript. Advertencias previas de tamaño de bundle/rutas de imágenes; sin nuevos errores de compilación.
- PASS: 234/234 unitarias (224 previas + 10 metodológicas nuevas). Catálogo, sumas, curvas, rangos, fronteras, faltantes, importación y exportación protegida.
- PASS: Playwright Battelle a 1366/1800, navegador limpio. SIN=20, CON=50, recta (0,1)/(100,0), peso BOD=25: CA 0,8/0,5; UIA 20/12,5; ΔUIA −7,5 y bandera mayor. Curva sintética (0,0)/(50,1)/(100,0): CA 0,4/1; ΔUIA +15. Son controles QA de aritmética, **no curvas de DBO validadas ni mediciones del proyecto**.
- PASS: recarga real, cuatro descargas JSON/CSV por ancho (ocho archivos leídos), importación del mismo proyecto con respaldo, rechazo de proyecto ajeno sin escritura, contenido inválido conservado y bloqueado.
- PASS: catálogo de métodos y archivos históricos Conesa; recorridos DEMO-001 Leopold y Conesa F1/F2/F3a/F3b mantienen resultados, datos originales intactos y motores separados.
- PASS: capturas completas, tabla y ficha 1366/1800 generadas y abiertas para revisión visual; función lineal y máximo interior visibles. Un problema de nombre accesible del textarea tras recarga se corrigió y quedó cubierto.
- CI completo: consultar checks y descripción actualizados del PR de esta rama. La nueva regresión y qa/ambienta-battelle/ están integrados al workflow existente (46 scripts de navegador).
- NOT_RUN: evaluación real del proyecto, pertinencia local de los 78 parámetros, otros perfiles de pesos, múltiples alternativas simultáneas, funciones discontinuas y biblioteca de curvas digitalizadas. Estas limitaciones no se ocultan tras cifras DEMO.
- BLOCKED_NOT_REPRODUCED: los incidentes históricos de Leopold/pez del PR #85 siguen pendientes; este trabajo no declara su causa resuelta.

Para retomar: conservar el perfil histórico; especificar aparte la adaptación argentina, si se requiere, y la procedencia/auditoría de curvas. Ampliar comparación multialternativa solo con horizonte y base SIN comunes. Los cambios metodológicos previos de Conesa no se aprueban implícitamente aquí. Las capturas están en el artefacto CI qa/ambienta-battelle/, junto con results.json y los archivos descargados. Código: BattelleModel.ts, BattellePanel.tsx/.css, battelle.test.mjs y battelle-smoke.mjs.
