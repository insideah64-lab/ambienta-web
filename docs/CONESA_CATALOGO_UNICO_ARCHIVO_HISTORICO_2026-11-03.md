# AMBIENTA — Una entrada de Conesa en el catálogo (03/11/2026)

## Diagnóstico
El catálogo de matrices mostraba dos tarjetas paralelas:
- `conesa-1997-2ex` «Conesa · motor anterior», con datos locales
  `ambienta-scored-matrix-v1:<projectId>:conesa-1997-2ex`;
- `conesa-simplificado-tutorial-v1` «Conesa simplificado · revisión»,
  con `ambienta-conesa-simplificado-v1:<projectId>`, evaluación
  residual `ambienta-conesa-residual-v1:<projectId>` y anexo de informe.

En ambos motores la importancia parte de
`±(3IN + 2EX + MO + PE + RV + SI + AC + EF + PR + MC)`.
No corresponde presentarlos como métodos de evaluación distintos.
La variante revisada explicita recargos críticos y clasificación,
tiene controles de RV y evidencia y ya integra impacto residual y
trazabilidad PGA. Las puntuaciones guardadas no deben homologarse
automáticamente: cambia el contrato del registro y sus justificaciones.

## Decisión e implementación
1. Mostrar en el catálogo una **única tarjeta «Conesa simplificado»**,
   junto a Leopold, RIAM y Battelle. La versión principal es
   `conesa-simplificado-tutorial-v1` sin modificar su motor, claves,
   fórmulas, valores históricos, cálculo residual ni exportaciones.
2. Dejar el editor anterior **fuera del catálogo principal**. Si el
   navegador contiene un documento anterior de ese expediente, ofrecer
   dentro de Conesa el bloque secundario «Archivo histórico».
3. Archivo válido: consultar resultados previos, seleccionar celdas y
   exportar CSV/JSON, **sin modificar** criterios, signo, fundamentos,
   evidencias o registros de la versión principal. Controles
   de edición desactivados y botón eliminar ausente.
4. Archivo inválido o JSON dañado: advertir que es ilegible y
   permitir descargar **el texto original**, sin sobreescribirlo
   ni poblar el motor revisado con valores inventados.
5. Sin archivo previo: no se muestra el bloque histórico. Se
   evitan dobles entradas redundantes para usuarios nuevos.
6. Grid balanceada de cuatro tarjetas en escritorio.

## Seguridad y precisión metodológica
- No hay migración automática, destrucción, sustitución ni
  conversión silenciosa de `conesa-1997-2ex`.
- Se conservan los IDs en los archivos locales. Si un usuario
  necesita usar valores de la edición anterior en una evaluación
  nueva, la comparación y justificación deberá hacerse manualmente.
- `RV=3` continúa fuera de escala para la variante revisada.
- Los impactos didácticos no equivalen a resultados reales
  de Diablillos ni a dictámenes ambientales.
- El método Conesa aplicado en estudios de 1997 y guías de 2010
  no siempre utiliza exactamente los mismos criterios de criticidad:
  por eso se preserva la atribución de la variante en documentos
  y se exige revisión profesional antes de una aplicación real.
- Sin escrituras, consultas o migraciones de Supabase.

## QA
El smoke `matrix-method-catalog-smoke.mjs` en navegadores
1366/1800 comprueba:
- cuatro tarjetas, solo un Conesa, sin legacy como par seleccionable;
- puntuación revisada -28 y categoría Moderado, RV=3 ausente;
- RIAM independiente -48;
- borrador anterior -27 visible solo en archivo de lectura;
- exportar archivo histórico sin alterar su JSON;
- recarga preserva ambos métodos y su separación;
- un archivo dañado conserva el texto original y permite respaldo;
- la V3 no desborda el viewport y no arroja errores JS.
Mantener V1/V2 intactas y esperar CI verde antes de fusionar.
