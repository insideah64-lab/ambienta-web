# AMBIENTA — Corrección visual de cabecera de la Matriz de Leopold

Fecha: 2026-11-04.

## Observación

El usuario aportó una captura en la que «Componente ambiental» aparecía al fondo de un bloque azul muy alto y casi vacío, con la siguiente columna parcialmente visible.

## Causa

La CSS de la tabla usaba `vertical-align:bottom` en todas las celdas del encabezado, y colocaba los botones de edición y eliminación **debajo** del título de cada acción. El encabezado de la tabla tomaba la altura del contenido más alto y hacía que la primera celda pareciera vacía.

## Solución

- La celda «Componente ambiental» tiene su contenido centrado verticalmente y una altura compacta, sin espacio superior artificial.
- Encabezados de acciones con dos renglones: fase y controles de edición compactos arriba; nombre de acción limitado visualmente a dos líneas abajo. El atributo `title` conserva el nombre completo para consulta.
- Los botones de edición y eliminación siguen presentes, con etiquetas de accesibilidad y foco destacado.
- Los cambios son únicamente de **maquetación**: no se alteran datos, cálculos Leopold, puntuaciones, persistencia ni formatos de importación/exportación.

## QA

`impact-matrix-builder-smoke.mjs` incorpora comprobación en Chromium de altura máxima de 88 px para la cabecera, alineación de centro vertical en la primera celda y presencia de los cuatro controles de acciones. Genera capturas `matrix-header-compact-1366.png` y `matrix-header-compact-1800.png`.

El PR no debe fusionarse hasta obtener CI completo SUCCESS, incluyendo pruebas V1/V2 y navegador; luego verificar Pages.
