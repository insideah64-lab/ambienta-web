# AMBIENTA V3 SIG — publicación separada y prueba Georef

**Estado:** candidata de publicación aislada en `/v3/`. V1 (raíz) y V2 (`/v2/`) se construyen sin modificar sus fuentes.

## Arquitectura
El repositorio público conserva `apps/web/` como fuente estable de V2. El script `v3/scripts/build-v3.sh` crea `apps/web-v3/` temporalmente desde una copia de V2 y aplica `v3/overrides/`. La distribución V3 se genera por separado en `dist/v3/`. No se copia el motor Python privado MITA, migraciones de base de datos, secretos o expedientes personales.

## Recorte SIG topológico
- Intersección Polygon/MultiPolygon con Turf `@turf/intersect` en BBOX WGS84.
- Conservar huecos y piezas múltiples; puntos y líneas usan motor precedente.
- Validación de anillos y huecos, clasificación de topologías inválidas y límites de complejidad; exportación bloqueada si el recorte es incompleto.
- Huella SHA-256 del archivo importado cuando existe; los bytes originales permanecen en el equipo, la capa local persistida es depurada; la salida recortada es un derivado.
- Limitaciones preexistentes en el navegador: GeoJSON hasta 1 MiB, 100 entidades y 12.000 vértices. La validación topológica limita a 3.000 segmentos por anillo.

## Prueba territorial real: Georef Salta
La función **Consultar centroides departamentales Georef · Salta** solicita un máximo de 50 registros de departamentos de la provincia 66 de Georef v2.1. Actualmente la consulta recuperó 23 registros, sin descargar la base nacional.

API oficial: `https://apis.datos.gob.ar/georef/api/v2.1/departamentos?provincia=66&max=50`

La respuesta real utilizada en QA contenía **Cachi**, ID `66014`, lat `-25.038755786`, lon `-66.202620089`. Con una BBOX aproximada de 10 km centrada en ese punto, la app exportó un punto administrativo coincidente con el centroide devuelto por Georef. La consulta, fuente, momento, licencia CC BY 4.0 y el hash del GeoJSON normalizado se muestran explícitamente.

**No atribuir estos puntos a perímetros jurisdiccionales, ubicación real de Diablillos ni área de impacto.** El hash de la capa normalizada **no** es el hash de la respuesta original de Georef; el manifiesto de exportación los diferencia. La consulta no reemplaza una capa local activa: la persona debe quitarla explícitamente. Las claves de almacenamiento V3 están separadas de V2.

## Evidencia automatizada
- QA principal privado SIG: **55/55** pruebas nativas, E2E Chromium, CI MITA PASS ([informe de desarrollo](https://github.com/insideah64-lab/plataforma-ambiental-argentina/blob/feature/ambienta-sig-topologico-v3-2026-10-31/docs/AMBIENTA_V3_SIG_TOPOLOGICO_QA_2026_10_31.md)).
- QA público V3: **15/15** casos importados de recorte SIG, compilación React y browser smoke para cóncavo, huecos, invalidación, original y SHA PASS.
- QA público Georef: llamada a API oficial v2.1, centroide Cachi, recorte, trazabilidad, almacenamiento de V2 intacto, **0 errores JS**.
- SHA-256 de los HTML compilados de V1 y V2 verificados antes/después de preparar V3, sin cambios.
- [Run de QA público validado](https://github.com/insideah64-lab/ambienta-web/actions/runs/41245090284).

## Trabajo posterior
- Contrastar el recorte topológico con **polígonos oficiales vectoriales** obtenidos de WFS/OGC API Features o extracción controlada de Georef NDJSON; no inferir una geometría oficial a partir de centroides.
- Considerar motor SIG en servidor y consultas espaciales paginadas para bases grandes.
- Pruebas visuales y funcionales en la URL pública de V3 tras el despliegue.

La herramienta es **experimental**, no certifica ningún EsIA, PGA, auditoría ambiental ni perímetro catastral.
