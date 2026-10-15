-- ==============================================================================
-- MIGRACIÓN: PERMITIR LECTURA DE PERFILES Y ACUDIENTES A USUARIOS AUTENTICADOS
-- ==============================================================================
-- Corrige el problema donde los docentes no podían consultar los nombres de los
-- acudientes en los modales de calificación y asistencia debido a las políticas
-- restrictivas de Row Level Security (RLS) en 'public.perfiles' y 'public.perfiles_acudientes'.

-- 1. Permitir lectura de nombres y datos públicos de 'perfiles' a todos los usuarios autenticados
drop policy if exists "usuarios leen su perfil" on public.perfiles;
drop policy if exists "usuarios autenticados leen perfiles" on public.perfiles;

create policy "usuarios autenticados leen perfiles"
  on public.perfiles
  for select
  to authenticated
  using (true);

-- 2. Permitir lectura de roles de acudientes a todos los usuarios autenticados
drop policy if exists "acudientes leen su rol" on public.perfiles_acudientes;
drop policy if exists "usuarios autenticados leen acudientes" on public.perfiles_acudientes;

create policy "usuarios autenticados leen acudientes"
  on public.perfiles_acudientes
  for select
  to authenticated
  using (true);

-- Notificar recarga del esquema
notify pgrst, 'reload schema';
