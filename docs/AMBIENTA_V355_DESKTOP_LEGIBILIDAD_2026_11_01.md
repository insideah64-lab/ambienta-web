# AMBIENTA V3.5.5 — Legibilidad y jerarquía visual en escritorio

Fecha: 2026-11-01. Rama experimental `feature/ambienta-v355-desktop-legibilidad-2026-11-01`. PR #18.

## Hallazgo documentado
Captura de 1800 px aportada por usuario: interfaz con tipografía de 8–12 px, tres columnas de resumen excesivamente apretadas, títulos, hitos y leyendas difíciles de leer. El usuario decidió que la fase actual es **solo aplicación web para escritorio**. No implementar rediseño móvil ni duplicar módulos responsive.

## Diseño y criterios de aceptación
- Fuente menú lateral **15 px**; título de proyecto **32–39 px**; textos principales de tarjetas **15 px**; secundarios **13 px**; paneles **18 px**; números KPI **36 px**.
- Evitar un dashboard de tres columnas comprimidas. En anchura >=1400 px usar dos columnas amplias; entre 1100–1399 px apilarlas para no truncar cronograma ni compromisos.
- Priorizar legibilidad y jerarquía; permitir desplazamiento vertical, nunca reducir tipografía para compactar todo en una sola pantalla.
- Conservar colores, identidad visual, enlaces y datos existentes. Los estilos son solo de escritorio y están acotados bajo `.ref-shell` y `@media(min-width:1100px)`.
- No modificar CSS móvil (<1100px) ni pantallas específicas de teléfono; el trabajo móvil queda expresamente fuera del alcance.
- Las tablas ambientales deben conservar nombres y códigos sin disminuir escala.
- El mapa no debe taparse con leyendas ni cambiar su geometría; V3.5.4 sigue intacta.

## Implementación
- `v3/overrides/src/desktop-readability.css` añade escala tipográfica de escritorio, espaciado y layout.
- `v3/overrides/src/App.tsx` importa el CSS, sin cambiar estado, routes, dominio V1/V2, entidades GIS.
- `v3/overrides/scripts/desktop-readability-smoke.mjs`: Playwright en 1800×950, 1440×900 y 1366×850, comprueba tamaño computado de fuentes, columnas, ausencia de overflow horizontal y vistas accesibles Área y SIG. Guarda nueve capturas.
- `.github/workflows/v3-preview.yml`: ejecuta el smoke y retiene `ambienta-v355-desktop-capturas` 30 días. Mantiene suite de integridad de V1/V2, SIG, GeoJSON, KML y regresiones anteriores.

## Notas QA
Primer CI detectó que la hoja V2 se aplica después del override en algunos selectores con igual especificidad; por eso las nuevas declaraciones `font-size` se establecen como prioritarias en esta hoja exclusiva para escritorio. No extrapolar PASS desde compilación si falla el test de tamaño computado.
No publicar hasta que pase Playwright, revisar visualmente las capturas de escritorio, guardar checkpoint y validar la publicación separada de GitHub Pages.

## Respaldo
Checkpoint `backup/ambienta-v355-desktop-readability-checkpoint-2026-11-01`. Continuar con respaldo CI verde al finalizar.
