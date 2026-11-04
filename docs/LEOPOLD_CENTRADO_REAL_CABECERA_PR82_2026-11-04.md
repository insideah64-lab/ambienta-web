# Matriz de Leopold · Centrando el texto real del encabezado

Fecha: 2026-11-04.

## Problema reportado

La primera corrección de PR #81 dejó el rótulo «Componente ambiental» cerca del borde **superior**, como muestra la captura del usuario. Se había probado que el *recuadro* del rótulo estaba centrado, pero no el *texto dentro del recuadro*.

## Causa raíz confirmada en la cascada CSS

La regla general `.ref-shell .amb-matrix-grid thead th span {display:block; ...}` tiene **más especificidad** que la antigua `.ref-shell .amb-matrix-corner-label {display:flex;align-items:center}`. El navegador obedecía el `display:block` de la regla general; el rótulo tenía un alto reservado de 56px pero mostraba sus letras en la parte superior. El mismo problema de especificidad afectaba al recorte de nombres de acciones y al margen de su etapa.

## Corrección mínima

- `.ref-shell .amb-matrix-grid thead th .amb-matrix-corner-label`: `display:flex; align-items:center` con especificidad superior a la regla general.
- `.ref-shell .amb-matrix-grid thead th .amb-matrix-column-head > span`: restaura el recorte de dos líneas.
- `.ref-shell .amb-matrix-grid thead th .amb-matrix-column-meta small`: quita margen sobrante.
- Sin cambios en React, datos, matrices, criterios, importación o exportación.

## Criterio de aceptación

El navegador ahora verifica **el centro de las letras**, obtenido con `Range.getBoundingClientRect()` sobre el nodo de texto, y no solamente el centro del elemento. Exigencias en 1366 y 1800px:

- El texto debe quedar centrado respecto a la celda, desviación máxima de 5px.
- `display:flex` y `align-items:center` realmente aplicados.
- El título de cada columna mantiene el recorte de dos líneas; cuatro columnas visibles.
- Se conserva la altura compacta del encabezado (máximo 88px).
- Las capturas `matrix-header-text-centered-1366.png`, `matrix-header-text-centered-1800.png` y vistas generales deben ser **inspeccionadas antes del merge**.
- No fusionar sin CI completo SUCCESS y posterior Pages SUCCESS.
