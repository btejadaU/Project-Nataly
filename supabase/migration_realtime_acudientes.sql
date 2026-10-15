-- Migración: Habilitar Supabase Realtime y Replicación Completa para Panel de Acudientes y Docentes
-- Ejecutar en el SQL Editor de Supabase

-- 1. Habilitar Replica Identity FULL en las tablas requeridas para Realtime
alter table if exists public.tareas replica identity full;
alter table if exists public.calificaciones replica identity full;
alter table if exists public.notificaciones replica identity full;
alter table if exists public.asistencias replica identity full;
alter table if exists public.apelaciones_calificaciones replica identity full;

-- 2. Agregar tablas a la publicación de Supabase Realtime de forma segura e idempotente
do $$
begin
  -- Asegurar que la publicación supabase_realtime exista
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  -- tareas
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tareas'
  ) then
    alter publication supabase_realtime add table public.tareas;
  end if;

  -- calificaciones
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calificaciones'
  ) then
    alter publication supabase_realtime add table public.calificaciones;
  end if;

  -- notificaciones
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones'
  ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;

  -- asistencias
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'asistencias'
  ) then
    alter publication supabase_realtime add table public.asistencias;
  end if;

  -- apelaciones_calificaciones
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'apelaciones_calificaciones') then
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'apelaciones_calificaciones'
    ) then
      alter publication supabase_realtime add table public.apelaciones_calificaciones;
    end if;
  end if;
end $$;
