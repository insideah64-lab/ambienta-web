# Sistema de iconografía AMBIENTA — Entrega inicial

Fecha: 02/11/2026 · Web V3 únicamente, escritorio. No altera V1/V2, datos, SIG ni geometrías.

## Alcance funcional
- **23 iconos vectoriales originales** (24 × 24, trazo de 1,7px, SVG nativo, sin imágenes raster ni fuentes externas).
- **Navegación:** 15 motivos individuales para Resumen, Expediente, Área de estudio, Impactos, PGA, Monitoreo, Auditorías, Evidencias, Mapas y SIG, Reportes, MITA satelital, Normativa, Biblioteca, Historial y Espacio privado.
- Marca/entorno de demostración: símbolo vegetal original.
- **Panel principal:** 4 tarjetas de recuentos, 4 indicadores ambientales (vegetación, agua, aire, ruido) y medidas del PGA (agua, biodiversidad, aire, vegetación).
- Ubicación: `v3/overrides/src/features/iconography/AmbientaIcon.tsx`.
- Hoja exclusiva de estilos: `v3/overrides/src/features/iconography/ambienta-icons.css`; se monta al final de `v3/overrides/src/main.tsx`.
- Se mantienen colores semánticos diferenciados y movimientos suaves solo al interactuar. `prefers-reduced-motion: reduce` desactiva las transformaciones y transiciones.
- Los SVG son decorativos cuando tienen etiqueta textual contigua (aria-hidden y focusable=false). Los enlaces mantienen sus nombres accesibles.
- **Runway:** no se gastaron créditos. La iconografía pequeña debe ser vectorial y gestionable en React; se puede reservar Runway para arte de portada o ilustración complementaria, previa decisión del usuario.

## Pruebas previstas
- Build TypeScript estricto; regresiones V1/V2 y tests SIG.
- Chromium: 1366, 1440, 1800 px; 15 destinos con motivos distintos; 4 KPI; 4 categorías de indicadores; medidas relacionadas; navegación a PGA; SVG con labels accesibles; CSS de movimiento reducido; cero JS errors/desbordes y expediente local intacto.
- Artefacto de CI: `ambienta-original-icons-desktop`, seis capturas de portada/PGA.
- La PR se mantiene DRAFT hasta comprobar CI y capturas. Después hacer copia del HEAD aprobado y solo entonces integrar y desplegar Pages.

## Límites
Los colores de iconos no equivalen a cumplimiento ambiental; no se sustituyen símbolos oficiales o cartografía SIG. Diablillos conserva el perímetro sintético QA y sus registros simulados; ningún icono crea mediciones, aprobaciones o hechos de campo.
