# AMBIENTA — Anexo Conesa en el informe técnico integrado
**Entrega 03/11/2026 · Base PR #51, `main`**

## Resultado del entregable
El informe técnico preliminar conserva sus diez secciones y agrega una
**undécima sección** únicamente cuando existen borradores Conesa
simplificados asociados al expediente, o cuando alguno presenta un
problema de lectura. El expediente sin Conesa mantiene intacta la
estructura precedente: no agrega ni simula puntuaciones.

### Entradas originales (solo lectura)
- `ambienta-conesa-simplificado-v1:<projectId>`: evaluación inicial.
- `ambienta-conesa-residual-v1:<projectId>`: hipótesis residual, medida,
  incertidumbre y referencias explícitas.
- `ambienta-impact-matrix-v1:<projectId>`: catálogo común de factores
  y acciones; los valores de Leopold **no** se copian a Conesa.
- `DemoState` del proyecto: impactos registrados, medidas, inspecciones,
  evidencias y estados documentales. Se reconstruyen relaciones
  únicamente por IDs únicos y correspondientes al proyecto activo.

La lectura no escribe localStorage, no edita borradores, no abre expedientes
privados ni modifica el dominio del PGA. No se incluyen archivos originales,
mediciones reales o geometrías acreditadas en el HTML.

### Cálculos reproducibles y advertencias
- Puntuaciones iniciales: se calculan exclusivamente con el motor
  `calculateConesa` de la variante didáctica versionada.
- Escenario residual: se reevalúa con `reviewResidual`, sin aplicar
  descuentos automáticos ni porcentajes de mitigación. `Evitado` no
  equivale a importancia 0.
- Si RV=3 (u otro valor fuera de escala) o el esquema es incorrecto,
  se rechaza ese borrador y se registra aviso; no se recupera un número
  antiguo ni se inventa.
- Si cambió el origen, falta evidencia, desapareció un factor/acción o
  hay conflicto de IDs, el resultado queda expresamente para revisión.
- Las inspecciones y evidencias se listan con sus identificadores;
  no se extrapolan a mediciones ni eficacia real.
- La sección indica signo, puntuación absoluta, categoría, criterios
  individuales y recargos, fundamentos, fuentes, incertidumbre,
  medidas, indicadores, frecuencia, responsables y limitaciones.
- El estado de la matriz de preparación del EsIA pasa a
  **Borrador metodológico (no acreditado)** cuando hay valoraciones,
  nunca a «cumplimiento validado».
- La salida es un HTML autónomo y seguro para imprimir en A4.
  Se escapan expresiones HTML de todos los campos de usuario y no
  se incorporan scripts al archivo.

### Alcance legal / metodológico
No constituye Estudio de Impacto Ambiental, autorización,
pronunciamiento de autoridad ni evaluación de eficacia.
Tampoco adjudica resultados ambientales reales a Diablillos.

## QA y promoción
- Regresión Node: inclusión opcional, no contaminación cruzada
  entre proyectos, seguridad de HTML, determinismo.
- Playwright: caso DEMO sin matriz (10 secciones, sin cifras);
  borradores QA expresos (11 secciones, 3 tablas del anexo);
  recálculo 28 → 13, diferencia -15, referencias de PGA,
  inspección y evidencia, integridad de localStorage y rechazo RV=3.
- Escritorio 1366 y 1800; se preservan tests existentes de 1440
  y los hashes de V1/V2.
- No fusionar antes de CI verde, capturas disponibles y
  confirmación separada del despliegue Pages.

## Pendiente estructural
La extracción desde localStorage es específica del navegador donde se
guardaron los borradores; no representa una base de datos compartida.
El siguiente trabajo será gestionar expedientes reales con procedencia,
adjuntos autorizados, permisos y revisión profesional, sin copiar
automáticamente borradores de DEMO a producción.
