# AMBIENTA V3.5.1 — Vista del polígono de ensayo Diablillos
2026-11-01 · Cambio aislado sobre `main` (página pública V3.5). No integra los PR experimentales V3.6–V3.9.

## Propósito
Enlace de visita para ver cómo AMBIENTA delimita un escenario sintético del caso documental Diablillos:
`https://insideah64-lab.github.io/ambienta-web/v3/?caso=diablillos&poligono=ensayo#/area`.

Se usa el mismo generador aprobado desde V3.2, sin geometrías inventadas adicionales: centro de ventana (-24.700000, -67.200000), radio nominal 5 km, ventana aproximada WGS84, polígono cóncavo con un hueco y cuatro zonas A–D creadas con el motor topológico existente. No son límites reales del proyecto, concesiones ni áreas de influencia.

## Contrato de seguridad
- La carga automática ocurre **solo** cuando el parámetro `poligono=ensayo` se incluye explícitamente junto con `caso=diablillos`.
- Se realiza antes de montar la pantalla, para que `Mapas y SIG` y `Área de estudio` lean la misma capa derivada sin duplicar responsabilidades.
- Solo si no hay una ventana AOI guardada, ni escenario de estudio, ni una capa SIG de trabajo anterior. Los tres son datos del usuario y se preservan incluso si no pueden validarse.
- Se escribe en almacenamiento local del navegador; no se publica ni se envía un GeoJSON a un servidor.
- La SHA-256 de la geometría sintética está calculada sobre JSON.stringify, con prueba nativa reproducible. No es autenticidad ambiental.
- Un error al guardar el escenario revierte el AOI precargado para evitar una configuración a medias.
- El rótulo visual indica *POLÍGONO DE DEMOSTRACIÓN, NO OFICIAL*, con centro y distancia de la ventana aproximada.
- Una persona que tenga un polígono previo continuará viendo **su propio trabajo**, sin sustitución: puede usar una ventana privada limpia para inspeccionar el ensayo.

## Verificación
- `tests/react-v3/diablillos-preview.test.mjs`: reproducibilidad hash y geometría, cuatro subáreas, un hueco, respeto de datos previos, idempotencia y reversión frente a errores de almacenamiento.
- `v3/overrides/scripts/diablillos-preview-smoke.mjs`: Chromium comprueba la precarga en ventana limpia, la pantalla de delimitación, el enlace a Mapas y SIG, una recarga, respeto del AOI previo y que otro caso de demostración permanezca vacío.
- `.github/workflows/v3-preview.yml`: añade el ensayo al conjunto de pruebas, sin modificar V1/V2.

## Publicación
La página GitHub Pages se construye en `main`; aprobar/fusionar este PR crea un cambio **V3.5.1 de presentación pública**, no promueve a producción los experimentos de mediciones o auditoría. Tras desplegar, verificar la página `?caso=diablillos&poligono=ensayo#/area`. Para navegar al mapa: pestaña **Mapas y SIG**.
