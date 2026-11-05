# MITA satelital — continuidad pública de QA

Fecha: 2026-11-05. [PR #89](https://github.com/insideah64-lab/ambienta-web/pull/89), rama `feature/mita-resultados-2026-11-05`, dependiente de #88. Base: `bfc935dfd78babd8ad728439287538e99028b4be`. Main reconfirmado: `841f1356f86a3561be70fb0d3c7ce961a8d3640b`.

Esta versión pública se limita a resultados verificables en el código y CI del repositorio público AMBIENTA. Omite referencias, contratos y detalles de implementación de repositorios privados. El informe de trabajo completo y las capturas se conservan localmente; no se incorporan nuevas imágenes a esta actualización pública.

## Cambios de la interfaz pública

La ruta `#/mita` ofrece recepción y revisión de informes, vinculación explícita al proyecto, controles de archivos, persistencia local y descargas. No ejecuta procesamiento satelital desde la página. No se modifican las fórmulas de matrices ni se trasladan resultados automáticamente a otros módulos.

## Commits

- `cf940a7f5978a32030a1ab2c1d07089691112b7f`: implementación de la interfaz y regresiones.
- `0fd2d9642394d9d270c0c541a31e776e0b6c94ec`: conserva el encabezado ilustrado original. Código final validado.
- El commit documental posterior publica este resumen; su HEAD y ejecución se registran en el PR #89.

## Resultados

| Comprobación | Estado | Evidencia pública / local |
|---|---|---|
| TypeScript y build | PASS | CI completo y build local |
| Pruebas unitarias | PASS | 261/261, seis nuevas |
| Dos demos, 1366/1800 | PASS | Cuatro combinaciones, Chromium limpio |
| Recarga y descargas | PASS | Archivos descargados y leídos; originales preservados |
| Controles de archivos y almacenamiento | PASS | Duplicados, archivo incorrecto, cuota y pestañas desactualizadas |
| Iconografía de 17 rutas | PASS | Regresión local y CI tras la corrección |
| Capturas completas y ampliadas | PASS | Generadas y abiertas localmente a ambos anchos |
| Primera ejecución CI | FAIL | 41968368832: faltaba el encabezado ilustrado; corregido sin debilitar pruebas |
| CI del código final | PASS | 41969005896; todos los pasos satisfactorios |
| Nuevo procesamiento satelital real | NOT_RUN | Fuera de esta entrega de interfaz |
| Validación científica independiente | NOT_RUN | No se infiere de las pruebas del adaptador |
| Publicación GitHub Pages | NOT_RUN | HOLD heredado; no se fusiona ni despliega |

[Primera ejecución con fallo](https://github.com/insideah64-lab/ambienta-web/actions/runs/41968368832). El test de iconografía detuvo la batería antes de llegar a MITA. La falta de archivos posteriores hizo fallar además la carga QA; no fue un nuevo fallo de cálculo ni un P0 ejecutado y fallido.

[CI 41969005896 — SUCCESS](https://github.com/insideah64-lab/ambienta-web/actions/runs/41969005896): build, pruebas unitarias, batería completa de navegador, diagnóstico P0, hashes V1/V2 y cargas de artefactos. La corrección restaura el pictograma y la estructura de encabezado del sistema existente.

Los datos de prueba son sintéticos para verificar la interfaz; no son mediciones ambientales de los proyectos. No se consumieron créditos de TinyFish ni vidIQ.

## Continuidad

Revisión local: `http://127.0.0.1:8787/v3/index.html#/mita`. Pruebas: `node --test tests/react-v3/*.test.mjs` y, tras el staging habitual y servidor local, `node apps/web-v3/scripts/mita-results-smoke.mjs`.

Paquete local: `AMBIENTA_MITA_Pruebas_y_Descargas.zip`, 21 archivos más manifiesto SHA-256, reabierto y verificado. La documentación completa local se identifica como `19_MITA_RECEPCION_RESULTADOS_COMPLETO_LOCAL.md`.

Pendientes: búsqueda de escenas y ejecución web, visor georreferenciado, series temporales y validación científica. Se conserva la cadena de PR #85 → #86 → #87 → #88 → #89 y el HOLD de publicación anterior. El resultado sobre el último HEAD documental queda enlazado en el PR.
