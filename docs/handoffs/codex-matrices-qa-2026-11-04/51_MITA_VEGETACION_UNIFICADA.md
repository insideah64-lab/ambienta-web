# MITA: una sola pestaña Vegetación

Fecha: 2026-11-05. Rama `feature/mita-vegetacion-unificada-2026-11-05`, apilada sobre el PR #99 y su HEAD `169f5e6c9c82781aa562bcaad2733d18e43c4ec0`. Commit de implementación: `8eb49fa461260f2161d49c9b6a6e4777fa7ece9c`. El commit documental posterior conserva este informe y capturas. HOLD: sin merge ni publicación; comprobar el resultado definitivo de CI en el PR de esta rama.

## Cambio solicitado

El usuario observó dos entradas de vegetación («Vegetación · NDVI» y «Sensores e índices») que parecían herramientas diferentes. Se sustituyeron por una sola opción **Vegetación**, junto a **Atmósfera · NO₂**.

Vegetación muestra los selectores de sensor/índice y el procesamiento multiespectral como recorrido principal. Los trabajos NDVI anteriores y el registro de informes importados quedan dentro de la sección desplegable «Resultados NDVI anteriores e informes importados». No se fusionaron ni migraron los esquemas de los productos. Los cálculos, archivos, identificadores, localStorage, Área de estudio, V1/V2 y el motor privado no se modificaron.

El procesamiento anterior se conserva dentro de un desplegable secundario para mantener el recorrido aprobado, sin presentar dos calculadoras abiertas en la vista inicial. Los enlaces `trabajo`, `producto` y `area=guardada` siguen funcionando. Los enlaces históricos abren automáticamente su sección; el enlace desde Área abre también su formulario anterior. Si una URL contiene simultáneamente un resultado multíndice y un trabajo previo, se prioriza la vista multíndice y los anteriores siguen disponibles al desplegar su sección.

La elección de abrir el historial se conserva con `historial=ndvi`. Se comprueba la actualización de URL antes de recargar en las pruebas. El panel anterior se monta al abrirlo, evitando consultas adicionales mientras está cerrado. En instalaciones estáticas se conserva la guía y la importación local, sin consultar una API inexistente.

## Validación final

| Verificación | Resultado | Alcance |
|---|---|---|
| TypeScript y build | PASS | Sin errores; advertencias previas de bundle/assets |
| Unitarias web | PASS | 283 pruebas existentes |
| Navegación única | PASS | Exactamente dos botones principales; una sola opción Vegetación; sin «Sensores e índices» separado |
| Multíndice y exportaciones | PASS | Playwright en ambas demos, 1366/1800, cuatro índices, cinco descargas y comparación |
| NDVI anterior | PASS | Búsqueda/cálculo conservado, recargas, polígono, enlace desde Área, píxel, paletas, zoom y descargas |
| Informes importados | PASS | Hash, originales descargados, recarga, almacenamiento dañado, pestañas concurrentes y cuota |
| NO₂ | PASS | Flujo y descargas conservados; vuelta a Vegetación unificada |
| Servicio real con resultados existentes | PASS | Ambas demos y ambos tamaños; URL con IDs nuevos/anteriores, reapertura del historial y enlaces antiguos |
| localStorage | PASS | Snapshots antes/después idénticos en recorridos de consulta |
| Capturas | PASS | Completas y ampliadas generadas, abiertas y revisadas a 1366 y 1800 |
| Nuevos cálculos satelitales | NOT_RUN | No eran necesarios; se consultaron las escenas ya procesadas y no se gastaron créditos |
| CI remoto | Consultar Checks del PR | El cierre definitivo se registra en la descripción del PR |
| Merge / Pages | NOT_RUN / HOLD | La vista actualizada está en el servicio local; no se publicó |

Capturas reales de la navegación: [1366](evidencias-vegetacion-unificada/DIAB-2026-DEMO-1366-navigation.png) y [1800](evidencias-vegetacion-unificada/DIAB-2026-DEMO-1800-navigation.png). [Resultados del recorrido real](evidencias-vegetacion-unificada/results.json).

Las capturas completas y de historial abierto están en `work/vegetation-unified-live-qa/` del workspace. Las pruebas sintéticas de CI conservan sus capturas completas en el artifact QA habitual, separadas de ese recorrido real. Se adaptaron los scripts existentes de MITA, NDVI, NO₂ y vegetación para abrir explícitamente el historial al probar los recorridos anteriores, sin retirar controles funcionales.

## Continuación

La ruta principal es `/v3/index.html#/mita?analisis=vegetacion`; las URLs anteriores sin `analisis` también muestran la pestaña unificada. Para revisar el caso ya calculado, conservar `caso=diablillos` antes del hash y `vegetacion=c6c0fc00da45b27621aae16074b0f1a1` después del hash. Agregar `historial=ndvi` para desplegar los anteriores. No es necesario recalcular imágenes ni importar otra vez los resultados.

Esta entrega reemplaza solo la separación de navegación descrita en el documento 47. Sus fuentes científicas, fórmulas, resultados, límites MODIS y pendientes metodológicos siguen vigentes. No se usaron créditos TinyFish/vidIQ ni servicios pagos.
