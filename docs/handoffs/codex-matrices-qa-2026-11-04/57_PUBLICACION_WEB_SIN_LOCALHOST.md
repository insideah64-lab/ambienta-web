# Publicación web estable — 2026-11-06

El usuario solicita publicar para dejar de depender del enlace localhost. Esta instrucción autoriza la publicación de la web validada; reemplaza el HOLD de publicación del frontend. El motor Python permanece privado y local; no se desplegaron ni contrataron servicios nuevos.

Base de entrega: `24c984e6f83a1f49a4a45b01d29575bc3f9b07a4`, PR #103, CI completo PASS. Main verificado antes de integrar: `841f1356f86a3561be70fb0d3c7ce961a8d3640b`; la rama está 45 commits por delante, sin commits faltantes de main. La entrega integra los desarrollos previos ya cubiertos por el CI completo y conserva su historial mediante merge.

## Acceso sin localhost

- La serie NDVI pública `6ea60b7337eb52a9e9c51311f5796647` puede consultarse en GitHub Pages sin API: gráfico, tabla, mapa de cambio con zoom, JSON y CSV.
- Registro explícito de publicaciones por proyecto/serie; no se expone automáticamente ningún resultado local ni de otro proyecto. Otras publicaciones futuras pueden añadirse al registro sin atar la herramienta a un único caso.
- JSON y CSV conservan bytes originales de la evidencia pública ya autorizada. Vista PNG reducida a 560 px a partir de la vista delta guardada: dominio fijo ±0,25, transparencia fuera del soporte común. No se recalculan ni alteran cifras, máscaras ni fórmulas.
- Se identifica como consulta pública. No hay nuevos cálculos, nuevas comparaciones, modificación del rango ni GeoTIFF descargable en esta copia. Zoom, vistas y recarga funcionan en el navegador.
- Los cálculos con servicio local conservan el recorrido, dominios y descargas anteriores. No se convierte la API de loopback en un servicio público sin autenticación.

URL prevista: `https://insideah64-lab.github.io/ambienta-web/v3/?caso=diablillos#/mita?analisis=vegetacion&modo=temporal&serie=6ea60b7337eb52a9e9c51311f5796647`.

## Verificación previa y cierre

| Verificación | Estado al preparar PR |
|---|---|
| Build y TypeScript | PASS |
| 291 pruebas Node | PASS |
| Consulta pública sin servidor a 1366/1800 | PASS |
| Prefijo /ambienta-web/v3/ y archivos relativos | PASS |
| Cero solicitudes a API y resultado de otro proyecto rechazado | PASS |
| JSON/CSV descargados idénticos a los publicados | PASS |
| Modo con motor, ambas demos y descargas | PASS |
| Capturas full/result/map a 1366/1800 abiertas | PASS |
| CI completo del HEAD de publicación | NOT_RUN: pendiente al preparar PR |
| Merge y despliegue Pages | NOT_RUN: esperar CI satisfactorio |
| Comprobación posterior de GitHub Pages | NOT_RUN: después del despliegue |
| Motor remoto de procesamiento | NOT_RUN: no se contrató ni desplegó |

El cierre por commit, runs, artefactos y URL verificada se registra en el PR de publicación y en `58_MITA_PAGES_ESTADO.json` local. Evidencia de la prueba sin servidor: `qa/ambienta-temporal-public/` y artefacto del CI. El diagnóstico inicial confirmó conexión rechazada en 127.0.0.1:8790; el problema era el servicio local apagado.
