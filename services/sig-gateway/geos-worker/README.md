# AMBIENTA · Motor avanzado GEOS para archivos GeoJSON grandes

**Estado:** prototipo de procesamiento local / laboratorio. **No está expuesto en la V3 pública.**

A diferencia del recorte de la página (1 MiB, 100 entidades y 12.000 vértices), este proceso independiente usa **GEOS vía Shapely 2.1.2** para trabajar con archivos locales de hasta **20 MiB, 2.000 entidades y 200.000 vértices**. Esto **no** equivale a una descarga masiva de una base nacional ni a un proxy WFS abierto.

## Instalación de laboratorio

Requiere Python 3.12.

```bash
python -m pip install -r services/sig-gateway/geos-worker/requirements.txt
python services/sig-gateway/geos-worker/clip.py \
  --input datos_originales.geojson \
  --bbox=-66.222472,-25.056742,-66.182768,-25.020769 \
  --output recorte_validado.geojson \
  --report trazabilidad_recorte.json
```

Para coordenadas negativas **usá `--bbox=...` con el signo igual**, de modo que `argparse` no interprete el valor como una opción.

## Contrato de datos
- Entrada **FeatureCollection** de **Polygon** y **MultiPolygon**, EPSG:4326 (lon, lat). No transforma otros CRS silenciosamente.
- Admite polígonos cóncavos, agujeros y componentes separados. No repara geometrías inválidas sin consentimiento.
- Bloquea respuestas WFS cuya cantidad anunciada no coincida con la cantidad recibida.
- Examina la topología de **todas** las entidades antes de exportar. Cualquier geometría inválida bloquea toda la exportación y crea un informe de revisión. No genera un GeoJSON incompleto con apariencia de válido.
- Si dos polígonos solo tocan la BBOX en un punto o segmento de área nula, esa intersección no genera un polígono.
- El archivo original se abre en **solo lectura**; su SHA-256 se registra en el manifiesto. La exportación contiene solo etiquetas depuradas y el índice de origen; **no reproduce todos los atributos** del archivo original.
- El resultado se escribe de forma atómica en un archivo nuevo, separado del original y del informe.
- **No sobrescribe archivos existentes**: usá una ruta nueva para la salida y el informe de cada ejecución; las auditorías previas se preservan.
- Los anillos que cruzan el antimeridiano se bloquean porque necesitan tratamiento geodésico específico.
- Los grados geográficos no representan metros cuadrados. No calcula superficies certificables, no acredita área de influencia y no asigna perímetro oficial a Diablillos.
- La licencia del conjunto de datos debe verificarse con la institución emisora antes de redistribuirlo.

## Evidencias de calidad
```bash
python -m unittest discover -s services/sig-gateway/geos-worker/tests -v
```

Escenarios: recorte cóncavo que produce dos fragmentos, polígonos con agujero, multipolígonos, 12.500 vértices, anillos abiertos y autointersecciones, rechazo de WFS incompleto y CRS ajeno a WGS84. CI: `.github/workflows/sig-geos-worker-ci.yml`.

## Próximo paso
Integrar un **trabajador GIS asíncrono autenticado** para cargas mayores a las del navegador, con cola, aislamiento de procesos, memoria/CPU acotadas y caducidad de archivos temporales. Esto requiere alojamiento que permita ejecutar GEOS y cuotas individuales reales. **No** conectar directamente este script a un endpoint público sin esas protecciones.

## V3.2 — adquirir WFS por subventanas sin perder los originales

El recolector `wfs_collect.py` crea **un único ZIP de auditoría** con todas las respuestas WFS crudas recibidas, sus huellas SHA-256, un GeoJSON ensamblado, un recorte GEOS y el informe topológico. Es una herramienta **local de laboratorio** y no tiene endpoint público ni cola de trabajos.

```bash
python services/sig-gateway/geos-worker/wfs_collect.py \
  --layer municipios \
  --bbox=-66.222472174,-25.056742206,-66.182768004,-25.020769366 \
  --output adquisicion_municipios_01.zip \
  --review adquisicion_municipios_01_bloqueo.json
```

**Esta orden sí consulta el WFS real de IDESA**. Usala solo cuando necesites efectuar una adquisición controlada. No ejecutes llamadas reales en cada commit, ni descargues automáticamente colecciones nacionales o provinciales completas.

Para comprobar el archivo resultante sin volver a consultar Internet:

```bash
python services/sig-gateway/geos-worker/verify_bundle.py adquisicion_municipios_01.zip
```

El ZIP incluye `raw_wfs/000.geojson` y las demás respuestas originales, `assembled_source.geojson`, `clip.geojson`, `clip_report.json` y `acquisition_manifest.json`. El validador verifica los hashes originales, reconstruye el mosaico a partir de las subventanas, vuelve a ejecutar GEOS y compara exactamente el recorte y su informe.

**Por qué no usar `startIndex` sin comprobarlo:** ciertos servidores WFS 1.0 tienen paginación dependiente de la implementación, sin orden estable garantizado. Esta versión subdivide geométricamente la BBOX cuando una respuesta tiene **20 o más entidades**, consulta cada ventana hija y exige que todas estén completas. La repetición exacta de 20 también se subdivide porque puede ocultar truncamiento. Todas las entidades deben tener ID estable; las duplicadas entre teselas se reconcilian y el total final debe coincidir con el anunciado por la consulta raíz. Si falla cualquier prueba, **no se genera ZIP con recorte**.

Límites conservadores: BBOX de hasta 0,7° por eje y 0,12 grados cuadrados, como máximo 20 entidades por respuesta, 1 MiB por respuesta, 64 peticiones por trabajo, 90 segundos de duración, 20 MiB acumulados, 2.000 entidades y 200.000 vértices. Las subventanas que no puedan completarse dentro de estos límites quedan `requires_review`, nunca `complete`.

La prueba automática utiliza un **WFS simulado**, sin llamadas a IDESA. Como un WFS mutable puede cambiar durante las consultas, la reconciliación de entidades **no garantiza una instantánea atómica**; el manifiesto consigna `snapshotAtomic: false`. El ZIP usa hashes para detectar alteraciones, pero **no está firmado digitalmente**, por lo que no acredita por sí mismo autenticidad institucional. Se debe verificar licencia y vigencia de cada conjunto de datos antes de redistribuirlo. La BBOX de Cachi es solo un ensayo, no la ubicación real de Diablillos.

**Estado de promoción:** sistema experimental local. La V3.1 pública continúa utilizando consultas acotadas y cuota compartida; esta vía avanzada requiere infraestructura posterior con trabajos autenticados, aislamiento de CPU/RAM y almacenamiento temporal controlado.
