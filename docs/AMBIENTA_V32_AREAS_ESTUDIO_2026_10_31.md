# AMBIENTA V3.2 — polígonos y asignación de áreas para el caso de estudio

**Estado:** función experimental de la página Área de estudio; zonas explícitamente SIMULADAS. No es la cartografía oficial de Diablillos.

## Objetivo
Permitir verificar qué sucede cuando se asignan usos funcionales y superficies a un **polígono de ensayo**, en vez de confundir la ventana BBOX con un perímetro minero o un área de influencia aprobada.

Se ofrece una acción manual para generar un polígono irregular con un hueco, contenido en la ventana de coordenadas indicada. Alternativamente, el operador puede seleccionar explícitamente **un solo polígono/multipolígono GeoJSON local ya importado**, siempre que esté completamente dentro de la ventana y tenga topología válida. **No** se transforma automáticamente una delimitación administrativa WFS ni la BBOX en el perímetro del proyecto.

## Las cuatro subáreas experimentales

| Categoría de simulación | Color | Cálculo |
|---|---|---|
| A · Operación | ámbar | Intersección del polígono con el primer cuarto longitudinal de su extensión |
| B · Monitoreo | cian | Segundo cuarto longitudinal |
| C · Restauración | violeta | Tercer cuarto longitudinal |
| D · Resguardo | verde | Cuarto longitudinal final |

Estas etiquetas **no representan usos reales del terreno ni porcentajes administrativos aprobados**; son etiquetas de laboratorio para ensayar balances de superficie, mapa, exportaciones y trazabilidad. El cuarto geométrico se utiliza solo como algoritmo de distribución: el tamaño final de cada zona resulta de la **intersección topológica real**, por lo que los porcentajes NO son necesariamente 25%.

El programa calcula la superficie de anillos (descontando agujeros), fragmentos y multipolígonos con una **aproximación esférica WGS84** de radio medio 6.371.008,8 metros. Presenta superficies en hectáreas, porcentaje respecto de la superficie total y diferencia residual (tolerancia de cierre de 0,05%). Verifica que las zonas no se solapen más allá de una tolerancia geométrica muy pequeña. No utiliza proyección equivalente ni geodesia elipsoidal de precisión pericial.

## Integridad
- El GeoJSON fuente permanece sin recortar: `sourceHash` indica su SHA-256 en la fuente importada o la geometría sintética generada.
- La capa de trabajo, incluso cuando contiene polígonos de IDESA, NO se sustituye ni se asume como perímetro real.
- El escenario derivado se guarda localmente con la BBOX y su hash de origen. Al cambiar las coordenadas o sustituir la fuente importada, las áreas anteriores dejan de mostrarse.
- Dos exportaciones independientes: **polígono base** depurado y **subáreas** en GeoJSON, con método, metadatos, porcentajes y advertencia `SIMULADO_NO_OFICIAL`.
- Si la fuente es multiparte, tiene huecos o es cóncava, el motor Turf conserva la topología que resiste la validación. Geometrías con cruce propio, excedidas o de tipo incorrecto se rechazan, sin inventar superficies.

## Procedimiento de QA
1. Ir a `/v3/?caso=diablillos#/area` y especificar coordenadas de prueba en la sección de ventana AOI. Son coordenadas de simulación, no delimitación acreditada.
2. Pulsar **Crear polígono sintético y 4 áreas**. Comprobar que aparecen los cuatro colores sobre el mapa, una superficie total en ha y cuatro participaciones porcentuales cuya suma es aproximadamente 100%.
3. Descargar el polígono base: comprobar contorno irregular y hueco original. Descargar subáreas: comprobar `sourceSha256`, tipos Polygon/MultiPolygon y `status: SIMULADO_NO_OFICIAL`.
4. Recargar: las áreas deben persistir. Cambiar la BBOX: el escenario anterior debe quedar inválido, sin que se reutilice a escondidas.
5. Importar un polígono GeoJSON de laboratorio y pulsar **Asignar 4 áreas a un polígono importado**: verificar que la capa original conserva su SHA, y que no se confunde el uso de esa geometría con verificación territorial.
6. Probar una fuente externa a la ventana o con topología incorrecta: esperar rechazo, no exportación parcial.

Pruebas de contrato Node: `tests/react-v3/study-areas.test.mjs`. Browser Chromium: `v3/overrides/scripts/study-areas-smoke.mjs`. Pipeline: `.github/workflows/v3-preview.yml`.

## Qué falta
La clasificación real de usos del suelo, unidades de gestión ambiental, fajas de protección, cuerpos de agua o instalaciones requiere **datos georreferenciados válidos y reglas de proyecto aprobadas**, no simples cuartos longitudinales. Para cartografía de informes o estudios oficiales también se deberá incorporar cálculo de superficie elipsoidal/equivalente y control de tolerancias, con el CRS y método documentados.

**La BBOX, el polígono de ensayo, las subáreas simuladas y el perímetro real de Diablillos son entidades distintas.**
