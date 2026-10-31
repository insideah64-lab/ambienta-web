# AMBIENTA — Versión web de pruebas

Sitio público de la Plataforma Ambiental Argentina. Este repositorio contiene exclusivamente el **frontend de navegador** y el flujo de despliegue GitHub Pages.

La aplicación compila con Vite y se publica mediante GitHub Actions. **No** contiene el motor MITA en Python, migraciones PostgreSQL, datos de clientes ni claves secretas. La credencial Supabase `sb_publishable_...` está diseñada para navegador; la autorización de los datos se aplica por Supabase Auth + RLS.

**GitHub Pages publicado:** https://insideah64-lab.github.io/ambienta-web/ — despliegue confirmado en [Actions #41165193196](https://github.com/insideah64-lab/ambienta-web/actions/runs/41165193196).

- Demostración: `index.html` — datos ficticios y persistencia local.
- Expedientes en nube: `cloud.html` — inicio de sesión y almacenamiento privado Supabase.

**Advertencia:** vista experimental, no utilizar con expedientes profesionales sensibles ni considerar certificación ambiental. El código MITA y el desarrollo principal permanecen en el repositorio privado `insideah64-lab/plataforma-ambiental-argentina`.

## GitHub Pages activado

El propietario habilitó Pages para la rama `gh-pages`. GitHub confirmó el despliegue HTTPS con los tres jobs **SUCCESS**: `build`, `deploy`, `report-build-status`. La ejecución publicada apunta al commit `01a98fd4274bdaed7113b25b471bd6b674be2a97`.

- [Demostración](https://insideah64-lab.github.io/ambienta-web/index.html)
- [Acceso a expedientes](https://insideah64-lab.github.io/ambienta-web/cloud.html)

**Prueba pendiente:** abrir la web en un navegador real y confirmar visualmente HTML, CSS, JavaScript, registro y correos; el éxito del despliegue no equivale a una prueba E2E.

Para permitir registro/confirmación de cuentas, agregar esta URL a [Supabase Auth Redirect URLs](https://supabase.com/dashboard/project/rqzeejnhszbbohaqdpgp/auth/url-configuration):

```text
https://insideah64-lab.github.io/ambienta-web/cloud.html
```

### Privacidad

La rama `gh-pages` contiene exclusivamente archivos compilados; en `main` está el frontend necesario para regenerarlos con Actions. **Ninguna rama incluye el motor Python MITA, migraciones, contraseñas o claves secretas de Supabase.** Los expedientes y archivos siguen protegidos por Supabase Auth y RLS. El sitio es experimental y debe ensayarse con datos ficticios.
