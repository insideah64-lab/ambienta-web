# AMBIENTA · Conesa F1 — implementación cualitativa según el libro (1997)

**Fuente**: Vicente Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, 3.ª ed. revisada/ampliada (1997), reimpresión 2000, páginas impresas **89–97** (PDF completo aportado por el usuario). El manual completo se utiliza como referencia metodológica; no se redistribuyen sus páginas ni figuras.

## Alcance realmente implementado

Disponible desde **Matrices → Conesa simplificado → Según libro · Conesa 1997 (experimental)**, en un subpanel de la **misma tarjeta** (no un quinto método en el catálogo).

- Signo + y −; naturaleza **x** para efectos previsibles cuyo carácter beneficioso/perjudicial no puede determinarse (p. 89): se puede mostrar la importancia absoluta, pero **no** se inventa signo ni clasificación positiva/negativa.
- Criterios IN, EX, MO, PE, RV, SI, AC, EF, PR y MC, con valores de la tabla 11 (p. 95). `RV=3` está expresamente fuera de escala.
- Extensión crítica puntual: `EX_CR=4` suma **8 puntos** al total porque `EX` tiene coeficiente 2 (pp. 90, 95). Requiere afección puntual y fundamento/evidencia.
- Momento crítico: `MO_CR=1` o `4` (p. 90). La tabla 11 resume +4 (p. 95); la alternativa +1 del texto **se conserva explícitamente y no se aplica de manera automática**.
- Recuperabilidad MC=4: el libro distingue impacto *mitigable* e impacto *irrecuperable con posibilidad de medidas compensatorias* (pp. 92–93). Se exige seleccionar la distinción, pero ambas opciones dan el mismo coeficiente numérico; la compensación debe documentarse. No equivale a demostrar que la medida se implementó.
- Categorías para signo adverso: importancia absoluta `<25`: irrelevante; `25≤I<50`: moderado; `50≤I≤75`: severo; `I>75`: crítico (p. 96). **Regla interpretativa F1**: la prosa de la edición 1997 se solapa en el valor 50. Se resuelve explícitamente como severo; 75 permanece severo porque el texto dice crítico *superior a* 75. Diferentes ediciones/implementaciones pueden usar reglas distintas. **No reasignar categorías de borradores anteriores.**
- Validación de evidencia para criticidad y compensabilidad; errores no se convierten en resultados.
- Registro de fundamento, evidencia y origen bibliográfico; exportaciones JSON/CSV con ID de versión, edición y regla de umbrales.
- Resultados vinculados por IDs de ejes acción×factor de la herramienta de identificación, no por las calificaciones de Leopold. Si el catálogo cambia, se conservan las evaluaciones desvinculadas para revisar y exportar.

## Compatibilidad y almacenamiento

- Variantes con almacenamiento separado:
  - Anterior (Excel): `ambienta-conesa-simplificado-v1:<projectId>`.
  - Antigua 1997 (motor legado): `ambienta-scored-matrix-v1:<projectId>:conesa-1997-2ex`.
  - **Nueva** libro cualitativo F1: `ambienta-conesa-libro-1997-f1:<projectId>`.
- **No** hay migraciones ni intercambios automáticos.
- La pantalla abre inicialmente la variante Excel anterior **para conservar tests y flujo de usuarios existentes**, con botón explícito para seleccionar la experimental basada en libro.
- Al detectar un documento F1 inválido: **bloquea escritura** y permite descargar su contenido original para recuperación, en vez de sustituirlo por documento vacío.
- No hay nuevos datos ni autorizaciones Supabase, no se modifica Conesa residual simplificado ni la valoración de los anexos actuales.

## Todavía NO incluido en F1

El libro no se limita a esta fórmula: quedan pendientes matriz depurada y exclusiones justificadas (p. 97), banderas rojas (p. 96), ponderación UIP (pp. 98 y ss.), valoración de magnitudes, funciones de transformación, medidas correctoras y escenarios, y programa de vigilancia ambiental. Estas **no** se simulan; serán fases F2–F5, con fuente, pruebas y decisiones metodológicas independientes. F1 no certifica EsIA ni normativa argentina.

## QA y controles de avance

- Pruebas Node: aritmética 28, recargos 29/32/34, límites 24/25/49/50/75/76, naturaleza x, recuperación 4 diferenciada, RV3 y entradas fuera de escala, validación estricta de entradas.
- Playwright: escritorio 1366/1800, una sola tarjeta Conesa, apertura explícita de F1, score, x, recargos documentados, MC compensable, exportación JSON/CSV, persistencia, compatibilidad con la variante anterior, rechazo de JSON corrupto sin sobreescribirlo.
- El workflow de GitHub guarda capturas en `ambienta-conesa-libro-f1` y mantiene la suite completa V1/V2/V3.

**Regla de promoción:** no fusionar hasta CI verde; si hay diferencias en la 4.ª edición de 2010, registrarlas antes de declarar equivalencia normativa o metodológica.
