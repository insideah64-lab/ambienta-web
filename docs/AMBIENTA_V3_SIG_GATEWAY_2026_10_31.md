# AMBIENTA V3 — Gateway SIG automático de IDESA Salta

**Fecha:** 31 de octubre de 2026. **Estado:** servicio Supabase Edge aislado y frontend experimental, sujeto a QA de navegador y publicación de V3.

## Infraestructura y separación
- Sitio estático: `https://insideah64-lab.github.io/ambienta-web/v3/`.
- API independiente: Supabase Edge Function `ambienta-sig-v3` en el proyecto existente `plataforma-ambiental-argentina`, sin alterar `ambienta-preview` ni la base de datos.
- `verify_jwt=true`. La web envía la clave pública **anon** de Supabase, que no es `service_role` ni proporciona autoridad de administrador. El rol anon no confiere acceso a tablas privadas protegidas por RLS.
- Railway fue descartado porque la conexión indicó que terminó su período de prueba y requiere plan.
- Conformidad de código compartido: el mismo motor V3 de recorte topológico se utiliza en Node y en Deno Edge, con tests de paridad.

## Contrato API
Una solicitud HTTP POST a la función Edge con JSON `{"layer":"municipios","bbox":[oeste,sur,este,norte]}` y token anon válido realiza la extracción oficial:

1. Acepta únicamente `municipios`, `otbn` o `vegetacion`; no se permite pasar un URL remoto arbitrario.
2. Consulta únicamente `https://geoportal.salta.gob.ar/geoserver/wfs` mediante WFS, en CRS EPSG:4326 y `maxFeatures=20`.
3. Limita extensión de BBOX: ancho y alto hasta 0,7° y producto hasta 0,12 grados cuadrados. También aplica máximo de 1 MiB de respuesta WFS, 12 s de espera y 12.000 coordenadas; el recortador examina anillos de hasta 3.000 segmentos.
4. Compara el recuento real de entidades WFS con los datos recibidos. Si el WFS devuelve un subconjunto, no se genera una exportación parcial (HTTP 409). Se rechazan geometrías no poligonales, CRS incompatibles y topología irresoluble.
5. Calcula SHA-256 de los **bytes originales** devueltos por IDESA y guarda la fecha, URL concreta, capa, BBOX, fuente, total e intersección.
6. Devuelve `source` (GeoJSON fuente depurado y **sin recortar**) y `clip` (intersección derivada). La web repite el recorte local y compara el resultado antes de conservar la capa en almacenamiento local.
7. La copia de trabajo solo conserva la propiedad de etiqueta y las coordenadas verificadas, no todos los atributos originales. Los bytes crudos del proveedor **no se almacenan permanentemente**; su SHA-256 permite documentar procedencia y detectar cambios.

## Seguridad y límites
- CORS exclusivo de `https://insideah64-lab.github.io`. HTTP OPTIONS habilita las cabeceras `Authorization`, `apikey` y `Content-Type`.
- JWT se comprueba en la pasarela Supabase, antes de invocar la función. El JWT anon es una clave **pública** y no distingue a usuarios individuales; no equivale a autorización personal.
- Contadores de tráfico y concurrencia en memoria de cada instancia. **No constituyen una cuota global distribuida**; para escalar públicamente deberá implementarse limitación centralizada por usuario/IP y supervisar consumo.
- No se descargan bases nacionales ni se reutilizan el WFS como proxy genérico.
- Supabase tiene cuota/consumo propios. Supervisar invocaciones para impedir costos o uso excesivo si se habilita tráfico masivo.
- El catálogo WFS y su disponibilidad no garantizan permiso de redistribuir cada capa: revisar licencias y fecha de actualización del dataset. La BBOX de consulta **nunca** es el perímetro oficial de Diablillos ni un área de influencia evaluada.
- Si la API falla o reporta datos incompletos, la interfaz mantiene los enlaces WFS para operación manual y muestra el error sin fabricar geometrías.

## Evidencia de QA
- Backend Node: pruebas HTTP locales de lista blanca, CORS, topología, huecos, límites, SHA, respuestas corruptas y paginación.
- Deno: `deno check` de la implementación Edge con Turf fijado en versión 7.4.0.
- API IDESA real: consulta limitada a la zona administrativa de Cachi y recorte poligonal.
- Supabase Edge real: llamada autenticada con token anon de bajo privilegio y comparación de fuente y recorte.
- Frontend React + Chromium: pruebas de botón automático, procedencia, exportación y persistencia pendientes del dictamen del PR.

**Referencias:** [informe inicial IDESA](./AMBIENTA_V3_IDESA_WFS_BBOX_2026_10_31.md), [IDESA Geoportal](https://geoportal.salta.gob.ar/developer/).
