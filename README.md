# AMBIENTA — Versión web de pruebas

Sitio público de la Plataforma Ambiental Argentina. Este repositorio contiene exclusivamente el **frontend de navegador** y el flujo de despliegue GitHub Pages.

La aplicación compila con Vite y se publica mediante GitHub Actions. **No** contiene el motor MITA en Python, migraciones PostgreSQL, datos de clientes ni claves secretas. La credencial Supabase `sb_publishable_...` está diseñada para navegador; la autorización de los datos se aplica por Supabase Auth + RLS.

**Sitio previsto:** https://insideah64-lab.github.io/ambienta-web/ (verificar activación en GitHub Pages).

- Demostración: `index.html` — datos ficticios y persistencia local.
- Expedientes en nube: `cloud.html` — inicio de sesión y almacenamiento privado Supabase.

**Advertencia:** vista experimental, no utilizar con expedientes profesionales sensibles ni considerar certificación ambiental. El código MITA y el desarrollo principal permanecen en el repositorio privado `insideah64-lab/plataforma-ambiental-argentina`.
