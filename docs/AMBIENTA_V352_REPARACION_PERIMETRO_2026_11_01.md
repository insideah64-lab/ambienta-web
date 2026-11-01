# AMBIENTA V3.5.2 — Reparación del perímetro del caso Diablillos
Fecha: 2026-11-01. Cambio aislado sobre main V3.5.1; **no incluye V3.6–V3.9 experimentales**.

## Problema y corrección
La demostración V3.5.1 cargaba una geometría artificial con un hueco, una entrante y cuatro franjas verticales. Se confundía con el perímetro del caso y dominaba visualmente el mapa. La nueva versión **no precarga** escenarios con el parámetro URL anterior, recupera el espacio de trabajo para construir perímetros propios y retira únicamente el escenario que conserve el marcador inequívoco de autogeneración V3.5.1. No borra AOI, escenarios de ensayo creados a mano ni capas SIG del usuario.

## Flujo de Área de estudio
1. **Perímetro declarado**: `PerimeterWorkbench.tsx` + `PerimeterDrawMap.tsx`. El usuario navega, amplía y hace clic en el mapa para añadir vértices; puede deshacer, limpiar y cerrar, o importar un único GeoJSON/ KML poligonal en EPSG:4326. Se validan anillos, huecos, concavidades y multipolígonos. Auto-intersecciones y geometrías inválidas se rechazan sin sobrescribir.
2. Cada contorno guardado exige **procedencia textual** y se almacena aislado en `ambienta-perimeter-*-v352`; guarda estructura GeoJSON, nombre/tipo de fuente, SHA-256 del texto original o del dibujo, fecha y, para importaciones, el texto fuente hasta el tamaño admitido. La etiqueta **NO VERIFICADO** se conserva. Se exige elección explícita y copia de respaldo antes de reemplazar un contorno existente.
3. La **ventana de consulta AOI** es diferente del perímetro. Ajustarla a la extensión guardada requiere botón; si hay otra ventana, se solicita confirmación. Ningún BBOX rectangular se promueve a perímetro.
4. **Zonificación opcional**: `StudyAreasWorkbench.tsx` reconoce primero el perímetro guardado, muestra **sin zonificar** hasta que se seleccione una operación experimental; si se generan franjas A–D, se describen como una **simulación**, nunca como usos del suelo aprobados.
5. **Mapas y SIG** se limita a visualizar el contorno fuente y sus propiedades. No posee un editor de perímetro adicional; dibuja el contorno irregular real ingresado sobre OpenStreetMap y centra la vista en su extensión. La BBOX deja de competir visualmente con el contorno. El GeoJSON original de la capa SIG del usuario no se modifica.
6. Se retira el segundo mapa duplicado de Área de estudio: el mapa de dibujo es la interfaz principal y el mapa de SIG es la herramienta de análisis.

## Limitaciones y autoridad
Un contorno dibujado o importado **no es oficial por sí mismo**. La aplicación no conoce el límite legal de la explotación Diablillos. El operador debe aportar la geometría con fuente, CRS y permiso o respaldo. No inventamos límites. Los nombres y metadatos importados no reemplazan verificación catastral, ambiental, de licencia o de documentación.
La aceptación actual es una validación geométrica local, no una aprobación administrativa ni una certificación topográfica.

## Pruebas
- `tests/react-v3/perimeter-source.test.mjs`: contornos irregulares, huecos, multipolígonos, errores topológicos, preservación y respaldos, ventanas AOI separadas, migración exacta del demo sin pérdida del resto.
- `v3/overrides/scripts/perimeter-editor-smoke.mjs`: Chromium: apertura sin rectángulo por defecto, importación irregular con hueco, guardado, exportación idéntica, visualización en GIS, no modificación de fuente, navegación y dibujo de vértices.
- CI `.github/workflows/v3-preview.yml`: se reemplazó la prueba antigua de precarga del demo por recorrido real de perímetro; V1/V2 permanecen inalterados.
- No fusionar a main hasta validación Node + Chromium satisfactoria y conservar checkpoint.

## Ramas y respaldo
Rama de implementación `fix/ambienta-v352-perimetro-real-editor-2026-11-01`.
Checkpoint `backup/ambienta-v352-perimetro-editor-checkpoint-2026-11-01`.
[PR #15](https://github.com/insideah64-lab/ambienta-web/pull/15).
