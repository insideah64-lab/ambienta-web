# AMBIENTA — Auditoría funcional integral y hoja de ruta por entregables

**Fecha:** 02/11/2026 · **Base inspeccionada:** main `42fe8f9f1184703b64bf4e88ec883bb2238dc00b` (V3.6.7)
**Tipo de revisión:** inspección de código y pruebas existentes; no auditoría de campo ni verificación de contenidos externos.

## Diagnóstico central

Los módulos publicados permiten ensayar operaciones documentales, cartográficas y de PGA, pero el flujo **proyecto → caracterización ambiental → evaluación → medidas → seguimiento → informe profesional** todavía no está cerrado.
En V3.6.7, `/reportes` únicamente presenta contadores y exporta un JSON del estado DEMO. En `/impactos` se muestran impactos cargados, su signo y el número de medidas asociadas, sin estimación de significancia ni método de valoración. Por tanto no es correcto decir que la plataforma genera un EsIA.

## Matriz de capacidades observadas

| Frente | Evidencia en código | Disponible | Brecha para uso profesional | Prioridad |
| --- | --- | --- | --- | --- |
| Proyecto y expediente | `App.tsx` /expediente; `web/domain.mjs` | Ficha DEMO y historial local | Creación/configuración de proyecto real, roles, procedencia y validación administrativa | Alta |
| Área de estudio | `StudyAreasWorkbench`, `AoiWorkbench`, editor de perímetro | AOI, perímetros locales, escenarios A–D explícitamente QA | Delimitación y área de influencia justificadas, origen oficial y aprobación profesional | Alta |
| Mapas y SIG | `GeoMap`, `aoi-clip`, `PointZoneAnalysis` | Importaciones GeoJSON, recortes, polígonos con huecos/concavidades, vínculos espaciales de ensayo | Mapas finales con escala, sistema de referencia, fuentes y anexos reproducibles | Alta |
| Línea base | Sin sección especializada en `NAV` | No implementado como campaña ambiental | Agua, suelo, aire, biodiversidad, social con estaciones/fechas/unidades/metodología | Crítica |
| Impactos | `App.tsx` `Impactos` | Inventario declarativo, factor, signo, etapa y relaciones | Criterios transparentes, magnitud, extensión, duración, reversibilidad, alternativas e incertidumbre | Crítica |
| PGA | `PGA`, `web/domain.mjs` | Medidas, responsables, indicadores, estados y relaciones | Indicadores medibles con unidad, umbral, frecuencia/registro real y verificación externa | Alta |
| Monitoreo | `Monitoreo`, `recordInspection` | Inspecciones declaradas de demostración | Campañas con series, mediciones, unidades, equipos, anexos y cadena de custodia | Alta |
| Evidencias | `Evidencias`, `EvidenceIntegrityLab` | Metadatos, vínculos y controles de integridad | Adjuntos realmente autenticados, origen y permisos; hash no demuestra autenticidad | Alta |
| Auditorías | `Auditorias`, `openFinding`, `addCorrectiveAction` | Hallazgos y acciones DEMO | Actas, responsables y normativa verificadas, seguimiento de cierre real | Alta |
| Normativa | `ToolSection` normativa | Placeholder explícito | Fuentes, jurisdicción, vigencia, obligaciones trazables y revisión profesional | Crítica |
| Biblioteca | `ToolSection` biblioteca | Placeholder explícito | Repositorio de anexos con permisos y procedencia | Alta |
| Motor satelital | `ToolSection` MITA | Separado del proyecto actual | Integración de resultados reales, fechas, incertidumbre y orígenes | Media |
| Reportes | `App.tsx` `Reportes` | Contadores y exportación JSON | Documento técnico integrado, luego EsIA revisado/firmado y anexos | Crítica |

**Límites de la evidencia:** la presencia de componentes o pruebas no es certificación de idoneidad profesional. SIG y expedientes DEMO no representan límites oficiales del caso Diablillos. Un estado «verificada» es solamente estado documental del prototipo.

## Decisión de producto: abandonar las microversiones

La unidad de progreso pasa a ser un **entregable completo con una prueba de extremo a extremo**, no una revisión por cada ajuste de botón o exportación. Se conserva versión anterior hasta QA integral y Pages.

### Entregable A — Diagnóstico preliminar exportable (este bloque V3.7.0)

**Objetivo:** conectar los módulos documentales en un informe humano legible, con fuente, IDs, matriz de vacíos y limitaciones explícitas.
- Entrada: expediente local DEMO intacto.
- Proceso: modelo puro de impacto ↔ medida ↔ inspección ↔ evidencia ↔ hallazgo ↔ acción, con IDs inequívocos y avisos de inconsistencias.
- Salida: HTML autoportante imprimible A4, sin recursos remotos, sin scripts, con diez secciones y una matriz de 12 componentes para evaluar faltantes.
- Criterio de aprobación: pruebas unitarias, exportación en navegador de escritorio (1366, 1440, 1800), contenido XSS escapado, datos locales intactos, V1/V2 y SIG preservados.
- **No equivale a un EsIA ni inventa datos de línea base, valores de impactos, coordenadas oficiales o normas.**

### Entregable B — Ingreso y procedencia de un expediente real (bloque posterior)

Crear flujo de proyecto, fuentes, archivos y responsabilidades con procedencia atribuible, lectura y permisos, sin sobreescribir originales. Criterio de aceptación: cargar un ejemplo público autorizado y reconstruir sus referencias/fechas/autores. Mantener Diablillos como QA sintético separado del proyecto real.

### Entregable C — Evaluación ambiental y cartografía técnica

Línea base con unidades y QA, impactos con metodología configurable/justificada, integración SIG como insumo con fuentes y limitaciones, alternativas, medidas derivadas, versión de normas y anexos. Revisión humana obligatoria. No generar puntuaciones ambientales a partir de estados documentales.

### Entregable D — EsIA/PGA/Auditoría completos y auditables

Reportes profesionales configurables, anexos, matrices, citación por origen, controles de completitud y revisión/firma humana. Prueba punta a punta con proyecto real permitido, identificando explícitamente todo dato ausente.

## Seguridad e integridad

- No tocar V1/V2, hashes, originales, GeoJSON/KML, recortes cóncavos ni huecos.
- Separar Área de estudio (define) y SIG (analiza).
- Específicamente Diablillos: polígonos A–D son QA, no contorno oficial.
- Sin afirmaciones automáticas de cumplimiento, autoría o aprobación normativa.
- Solo versión web de escritorio; no TinyFish por créditos.
- Handoff/backup completos por bloque de entrega, CI/Pages comprobados para promoción.
