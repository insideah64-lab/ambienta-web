# AMBIENTA · Leopold QA4 — revisión cualitativa de interacciones destacadas

Fecha: 2026-11-04. Base: `main` tras el PR #72 (commit `0337c16113545645add7a89b529680485eacda42`).

## Fuente y límites

Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, 3.ª ed., 1997, §6.2.1.1, pp. impresas 60–61, cuadro 3, describe la matriz clásica de Leopold: magnitud con signo (1–10), importancia (1–10), análisis de acciones y factores, discusión de calificaciones destacadas y celdas aisladas, precaución con interacciones duplicadas. No especifica umbrales universales que certifiquen significancia ecológica ni una fórmula única para compensar impactos.

## Implementación

- Nuevo modelo puro `LeopoldReview.ts`, sin efectos laterales, que examina exclusivamente pares de magnitud e importancia **completos y válidos**; respeta interacciones declaradas ausentes y separa pendientes de no evaluadas.
- Nuevo panel `LeopoldReviewPanel.tsx`, visible únicamente en modo Leopold y detrás de los agregados existentes, con controles temporales: magnitud mínima, importancia mínima, regla de cualquiera (O) o ambas (Y).
- Controles iniciales: **8 y 8**, solo un **ejemplo exploratorio configurable**, NO umbrales legales, de Leopold o de Conesa; no quedan almacenados en el expediente ni alteran la matriz.
- Tabla de hallazgos con magnitud e importancia independientes, signo, indicación de fundamento/evidencia, y enlace al editor original de la celda. Las filas y columnas tienen recuentos de interacciones resaltadas.
- Se marca una **valoración aislada** únicamente cuando es la única interacción completamente valorada dentro de la fila o columna, nunca como afirmación de que no existen otras interacciones pendientes.
- Las valoraciones adversas se presentan primero para facilitar la revisión; el orden NO es un ranking de significancia y NO utiliza `magnitud × importancia` para clasificarlas.
- No produce impactos sintéticos, no interpreta la ausencia de hallazgos como ausencia de impactos, ni compensa perjuicios ambientales con beneficios económicos.
- Mantiene estructura `ambienta.impact-matrix.v1`, clave `ambienta-impact-matrix-v1:`, importación/exportación anterior, valores registrados, Conesa y RIAM. **Sin migraciones, escrituras o cálculos adicionales al borrador.**

## Pruebas y HOLD

- `tests/react-v3/leopold-qa4-review.test.mjs`: escalas, O/Y, pendientes, interacciones ausentes, calificaciones aisladas, prueba de no mutación y ausencia de falsos ceros.
- `v3/overrides/scripts/leopold-workbook-parity-smoke.mjs`: agrega escenario E2E QA4 sobre el ejercicio didáctico de túneles, prueba selección 10/10 (cero hallazgos), 1/1 (49 completas tras hacer una pendiente), invariancia de JSON en almacenamiento, selección de inspector y captura 1366/1800.
- Mantener sin cambios el conjunto de 50 valoraciones del ejercicio y el cálculo auxiliar de suma +4 del PR #72.
- **No fusionar** si fallan los tests numéricos, el flujo de navegador, la compilación o la integridad V1/V2; la rama solo es candidata a integración tras un CI PASS.
- Pendiente para QA5: asociar equipo revisor, fecha y decisión explícita sin escribir sobre puntuaciones; discutir duplicados semánticos con intervención humana y matriz reducida opcional.

**Dictamen de alcance:** herramienta para guiar discusión profesional, no conclusión automática de EIA ni certificación jurídica.
