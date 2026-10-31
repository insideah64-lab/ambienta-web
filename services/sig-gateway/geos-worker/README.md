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
- Los grados geográficos no representan metros cuadrados. No calcula superficies certificables, no acredita área de influencia y no asigna perímetro oficial a Diablillos.
- La licencia del conjunto de datos debe verificarse con la institución emisora antes de redistribuirlo.

## Evidencias de calidad
```bash
python -m unittest discover -s services/sig-gateway/geos-worker/tests -v
```

Escenarios: recorte cóncavo que produce dos fragmentos, polígonos con agujero, multipolígonos, 12.500 vértices, anillos abiertos y autointersecciones, rechazo de WFS incompleto y CRS ajeno a WGS84. CI: `.github/workflows/sig-geos-worker-ci.yml`.

## Próximo paso
Integrar un **trabajador GIS asíncrono autenticado** para cargas mayores a las del navegador, con cola, aislamiento de procesos, memoria/CPU acotadas y caducidad de archivos temporales. Esto requiere alojamiento que permita ejecutar GEOS y cuotas individuales reales. **No** conectar directamente este script a un endpoint público sin esas protecciones.
