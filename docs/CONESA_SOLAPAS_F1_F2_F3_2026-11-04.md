# AMBIENTA · Conesa: fases por solapas, no apiladas

Fecha: 2026-11-04. Solicitud: reemplazar la pantalla vertical interminable de Conesa por una interfaz separada en solapas.

## Interfaz

Conesa sigue siendo **una sola metodología y una sola tarjeta**. Sus cuatro espacios, con títulos comprensibles, son:

1. **Valorar impactos (F1)**: matriz cualitativa por acciones y factores, naturaleza, importancia, fundamento y evidencia; exportación CSV/JSON F1.
2. **Depurar y ponderar (F2)**: criba, impactos determinantes/intangibles, alertas, pesos UIP y revisión profesional; exportación F2.
3. **Calidad ambiental (F3a)**: indicadores, fuentes, unidades, escenarios SIN/CON proyecto y función lineal justificada.
4. **Curvas (F3b)**: revisión de curvas documentadas, catálogo de Anejo 4, digitalización, doble lectura y trazabilidad; reutiliza el indicador, unidad y escenarios declarados en F3a. Dispone de una vuelta directa a F3a para modificarlos.

Estas siglas son **nomenclatura interna de AMBIENTA**, no nombres oficiales de fases publicados por Conesa. No se sugiere que una de las fases sea un método distinto, ni que el sistema constituya un EIA completo o homologado.

## Arquitectura de no pérdida

- `ConesaLibroPanel` agrega un `tablist` WAI-ARIA con 4 botones, `aria-selected`, `aria-controls`, `tabIndex` por foco y teclado Flecha izquierda/derecha, Inicio/Fin.
- Los paneles se **mantienen montados** y solo se ocultan de la vista mediante `hidden`. Se conserva selección, ediciones y estado interno durante el cambio de etapa.
- El motor `ConesaF3Panel` se monta **una sola vez**, recibe `focus='f3a'|'f3b'` y conserva los borradores de escenarios y curvas en su estado compartido. No se crean dos editores ni se escriben dos copias de una evaluación.
- F3a permite completar indicador, unidades, procedencia y SIN/CON; la función lineal tiene su editor aquí. F3b permite escoger curva por nudos, editarla y auditarla. La selección de modo por factor se conserva; alternar de solapa no convierte ni revalora datos.
- Se conservan sin modificación los esquemas y claves existentes:
  - `ambienta-conesa-libro-1997-f1:`
  - `ambienta-conesa-libro-1997-f2:`
  - `ambienta-conesa-libro-1997-f3a:`
  - `ambienta-conesa-libro-1997-f3b:`
  - claves adicionales de catálogo, auditoría F3b y anexos.
- Las solapas y su selección no se persisten como nueva edición o en puntuaciones. Ningún documento vacío se escribe por la navegación.
- La cartografía, Leopold, RIAM, Conesa histórico simplificado, expedientes V1/V2 y exportaciones quedan sin migrar.

## Pruebas

- `matrix-method-catalog-smoke.mjs`: solapas visibles, cuatro roles tab, ocultamiento correcto de las otras etapas, teclado y ausencia de nuevas escrituras por navegación.
- `conesa-libro-f2-smoke.mjs`: puntuación F1, pasar a F2, criba/UIP, recarga y recuperación malformada.
- `conesa-libro-f3a-smoke.mjs`: indicadores, SIN/CON, función lineal, resultados, accesibilidad, recarga, fuente y conservación.
- `conesa-libro-f3b-smoke.mjs` y `conesa-f3b-auditoria/visual/anejo4-atmosfera-smoke.mjs`: configurar base F3a, activar la solapa F3b, curva y auditoría, preservar fuentes en recarga, errores y respaldos.
- Las pruebas unitarias, builds y comprobaciones V1/V2 originales deben permanecer verdes. **No publicar sin CI completo PASS.**

## Consideraciones

La distinción F3a/F3b es de **interfaz**: la función de transformación efectiva se selecciona por factor, y los resultados no se suman automáticamente con F1/F2. La visualización conserva el estado cuando se cambian las solapas; la validez del cálculo continúa sujeta a las fuentes y criterios de cada evaluación.
