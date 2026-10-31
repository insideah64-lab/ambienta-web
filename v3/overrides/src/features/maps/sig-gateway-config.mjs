// Public, low-privilege Supabase anon JWT for Edge gateway authentication (NOT service_role).
// Supabase client-safe key: only the project anon role and RLS permissions apply.
// Rotate centrally if the public anon key is disabled or replaced.
export const SIG_API_BASE='https://rqzeejnhszbbohaqdpgp.supabase.co/functions/v1/ambienta-sig-v3';
export const SIG_API_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxemVlam5oc3piYm9oYXFkcGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MDMxNDgsImV4cCI6MjEwODk3OTE0OH0.hrM2yAY24LU4t2mdw5EJzADYTKcNirIS3-HoH0VyQNY';
