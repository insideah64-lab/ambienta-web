# AMBIENTA — Versión web de pruebas

Sitio público de la Plataforma Ambiental Argentina. Este repositorio contiene exclusivamente el **frontend de navegador** y el flujo de despliegue GitHub Pages.

La aplicación compila con Vite y se publica mediante GitHub Actions. **No** contiene el motor MITA en Python, migraciones PostgreSQL, datos de clientes ni claves secretas. La credencial Supabase `sb_publishable_...` está diseñada para navegador; la autorización de los datos se aplica por Supabase Auth + RLS.

**Sitio previsto:** https://insideah64-lab.github.io/ambienta-web/ (verificar activación en GitHub Pages).

- Demostración: `index.html` — datos ficticios y persistencia local.
- Expedientes en nube: `cloud.html` — inicio de sesión y almacenamiento privado Supabase.

**Advertencia:** vista experimental, no utilizar con expedientes profesionales sensibles ni considerar certificación ambiental. El código MITA y el desarrollo principal permanecen en el repositorio privado `insideah64-lab/plataforma-ambiental-argentina`.

## Activar GitHub Pages (único paso pendiente)

La compilación fue publicada en la rama **`gh-pages`** mediante [GitHub Actions](https://github.com/insideah64-lab/ambienta-web/actions/runs/41164958085) con resultado **SUCCESS**.

En el repositorio abrir [Settings → Pages](https://github.com/insideah64-lab/ambienta-web/settings/pages), elegir **Deploy from a branch**, rama **`gh-pages`**, carpeta **`/(root)`**, y guardar. Esta operación administrativa requiere al propietario; no pudo realizarse mediante la conexión de GitHub disponible.

Después de activarla, las URL previstas (a verificar en navegador) son:

- https://insideah64-lab.github.io/ambienta-web/index.html — demostración.
- https://insideah64-lab.github.io/ambienta-web/cloud.html — Supabase Auth.

Para usar la segunda, agregar su URL exacta a [Supabase Auth Redirect URLs](https://supabase.com/dashboard/project/rqzeejnhszbbohaqdpgp/auth/url-configuration) y evitar utilizar la dirección anterior de Edge Functions que solo mostraba HTML como texto.

### Privacidad

La rama `gh-pages` contiene exclusivamente archivos compilados; en `main` está el frontend necesario para regenerarlos con Actions. **Ninguna rama incluye el motor Python MITA, migraciones, contraseñas o claves secretas de Supabase.** Los expedientes y archivos siguen protegidos por Supabase Auth y RLS. El sitio es experimental y debe ensayarse con datos ficticios.
