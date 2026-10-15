-- ==============================================================================
-- MIGRACIÓN: PERMISOS Y CLAVE FORÁNEA EN TABLA NOTIFICACIONES
-- ==============================================================================
-- Soluciona el error HTTP 403 Forbidden al insertar notificaciones desde el cliente
-- y permite enviar notificaciones tanto a acudientes como a docentes.

-- 1. Actualizar la clave foránea de recipient_id para que pueda referenciar cualquier perfil
-- (en el esquema inicial referenciaba únicamente a 'perfiles_acudientes', lo que impedía
-- enviar notificaciones a los profesores como confirmaciones de lectura o apelaciones).
do $$
begin
  -- Eliminar restricción previa si existe
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'notificaciones_recipient_id_fkey'
      and table_name = 'notificaciones'
  ) then
    alter table public.notificaciones drop constraint notificaciones_recipient_id_fkey;
  end if;

  -- Crear nueva referencia a public.perfiles(id)
  alter table public.notificaciones
    add constraint notificaciones_recipient_id_fkey
    foreign key (recipient_id) references public.perfiles(id) on delete cascade;
end $$;

-- 2. Asegurar que RLS esté activo en notificaciones
alter table public.notificaciones enable row level security;

-- 3. Política de INSERCIÓN: Permitir que todos los usuarios autenticados inserten notificaciones
drop policy if exists "usuarios autenticados insertan notificaciones" on public.notificaciones;
create policy "usuarios autenticados insertan notificaciones"
  on public.notificaciones
  for insert
  to authenticated
  with check (true);

-- 4. Política de LECTURA (SELECT): Destinatarios, docentes y administradores pueden leer
drop policy if exists "acudientes leen notificaciones" on public.notificaciones;
drop policy if exists "usuarios autenticados leen notificaciones" on public.notificaciones;
create policy "usuarios autenticados leen notificaciones"
  on public.notificaciones
  for select
  to authenticated
  using (
    recipient_id = auth.uid()
    or public.es_profesor()
    or public.es_administrador()
  );

-- 5. Política de ACTUALIZACIÓN (UPDATE): El destinatario puede marcar como leída
drop policy if exists "acudientes actualizan notificaciones" on public.notificaciones;
drop policy if exists "destinatarios actualizan notificaciones" on public.notificaciones;
create policy "destinatarios actualizan notificaciones"
  on public.notificaciones
  for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Notificar recarga del esquema a PostgREST
notify pgrst, 'reload schema';
