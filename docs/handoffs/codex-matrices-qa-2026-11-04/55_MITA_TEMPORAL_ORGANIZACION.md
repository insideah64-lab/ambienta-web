# MITA temporal: organización de escritorio — 2026-11-06

Continuación de #101 y #102. Base `8c84549e21b36d0c01e50fde71c8725ad7a7894b`. Rama nueva `feature/mita-temporal-organizacion-2026-11-06`.

## Cambios

- Navegación de Vegetación/Atmósfera y selector del tipo de análisis en una misma fila de escritorio.
- Configuración agrupada en sensor/índice, delimitación/período y criterios de calidad. Al abrir un resultado guardado queda plegada con resumen visible; puede reabrirse para preparar otro análisis. Ayuda del perfil y criterios disponibles bajo controles desplegables.
- Resultado antes del archivo de seguimientos. Descargas JSON/CSV/GeoTIFF junto al título, cobertura común y conteo de fechas siempre visibles.
- Tres vistas: Evolución, Mapa de cambio, Datos y calidad. `vista_t=evolucion|mapa|datos` se conserva en URL, junto con serie, zoom y escala existentes. Botones nativos con estado seleccionado y operación por teclado.
- Fechas excluidas identificadas con aviso que abre Datos y calidad. Si no hay soporte suficiente se abre esa tabla y se deshabilita el mapa; no se inventan ceros.
- Tandas terminadas plegadas, selección transitoria despejada tras aceptar el procesamiento o crear la serie. Los resultados originales permanecen en el historial.
- CSS acotado para neutralizar márgenes y estilos heredados de MITA que generaban espacios innecesarios. No cambian fórmulas, umbrales, archivos científicos ni motor.

## Verificación

| Comprobación | Estado | Evidencia |
|---|---|---|
| Build y TypeScript | PASS | build V3 |
| Pruebas Node | PASS | 290 |
| Playwright temporal, ambas demos, 1366/1800 | PASS | navegación por teclado, URL/recarga, procesamiento, comparaciones, 3 descargas y caso sin soporte |
| Regresión de Vegetación multíndice | PASS | ambas demos, sensores e índices, descargas, recarga e historial |
| Serie real guardada, 1366/1800 | PASS | 3 descargas por ancho, sin errores de página ni HTTP >=400; localStorage intacto |
| Revisión visual | PASS | capturas completas, gráfico, mapa, calidad y configuración generadas; full/chart/change abiertos en ambos anchos |
| CI completo del nuevo HEAD | NOT_RUN | pendiente al escribir; registrar cierre y commit exacto en el PR |
| Motor Python | NOT_RUN | no cambia en esta entrega; #14 ya validado |
| Fusión y publicación | NOT_RUN | HOLD vigente |

Evidencia local: `work/temporal-layout-real-qa/` (PNG completos y ampliados, resultados JSON y archivos descargados), `work/temporal-layout-*.txt`. Las nuevas capturas sintéticas se guardan como artefactos del CI existente en `qa/ambienta-temporal/`, separadas de la evidencia satelital real anterior de #102.

La serie real `6ea60b7337eb52a9e9c51311f5796647` conserva sus datos: cuatro adquisiciones, tres elegibles y 1.091.969 píxeles comunes. El cambio es de presentación y navegación. Pendiente de producto: validar nuevas temporadas y polígonos con protocolo de campo, según documento 53.
