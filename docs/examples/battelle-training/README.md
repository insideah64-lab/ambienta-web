# Datos sintéticos para Battelle-Columbus

Todos los datos nuevos y funciones son de capacitación, sin calibración ambiental. No son mediciones ni evaluaciones de proyectos reales. No se modifican las demos originales.

## Archivos importables

- [Urbanización: 6 fichas, 94 UIP, subtotal -20,42 UIA](DEMO-001_Battelle_SINTETICO.json): importar en DEMO-001. Faltan 72 parámetros; no es un total del estudio.
- [Diablillos DEMO: 7 fichas, 136 UIP, subtotal -27,00 UIA](DIAB-2026-DEMO_Battelle_SINTETICO.json): importar en DIAB-2026-DEMO (URL con `?caso=diablillos`). Faltan 71 parámetros. Las cifras no describen Diablillos real.
- [Control técnico de los 78 parámetros](DEMO-001_Battelle_CONTROL_78_NO_EVALUACION.json): solo para probar el cálculo exhaustivo en DEMO-001. CA=0,5/0,4, UIP=1000, UIA=500/400, delta=-100. No tiene significado ambiental ni representa funciones de los parámetros originales.

Antes de importar, exportar el JSON del borrador existente. La importación reemplaza el borrador activo de Battelle, previa confirmación y respaldo local. El control no se añade al caso Urbanización: es un documento alternativo de QA. Reimportar el respaldo para volver al escenario anterior.

## Informe, verificación y reproducción

[Informe con supuestos, unidades, funciones, resultados por ficha y pasos de carga](../../handoffs/codex-matrices-qa-2026-11-04/16_INFORME_DATOS_SINTETICOS_DEMOS_BATTELLE.md).

Generar los archivos y comprobar sus valores numéricos de referencia:

```sh
node v3/overrides/scripts/generate-battelle-demo-pack.mjs
```

Con el build V3 servido en `http://127.0.0.1:8787/v3/`, ejecutar la importación real, recargas y lectura de descargas:

```sh
node apps/web-v3/scripts/battelle-demo-pack-smoke.mjs
```

El script comprueba ambos casos y el control a 1366/1800, doce archivos descargados, preservación de los otros módulos y respaldo del documento anterior. Artefacto CI: `qa/ambienta-battelle-demo-pack/`.

Leopold y Conesa conservan sus fórmulas y datos. Estos JSON pertenecen solo al perfil histórico de Battelle y no trasladan valores a los otros métodos.
