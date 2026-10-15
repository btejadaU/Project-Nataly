-- Migración: Relación Docentes <-> Materias, Unicidad de Materias y Soporte de Horarios Interactivos
-- Ejecutar en el SQL Editor de Supabase

-- 1. Unicidad de nombres de asignaturas insensible a mayúsculas y espacios en blanco
create unique index if not exists asignaturas_name_unique_lower_idx 
on public.asignaturas (lower(trim(name)));

-- 2. Tabla relacional directa entre Profesores y las Materias que imparten
create table if not exists public.profesor_materias (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.perfiles_profesores(id) on delete cascade,
  subject_id uuid not null references public.asignaturas(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, subject_id)
);

-- Políticas de Seguridad RLS para profesor_materias
alter table public.profesor_materias enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'profesor_materias' and policyname = 'usuarios leen profesor_materias'
  ) then
    create policy "usuarios leen profesor_materias" on public.profesor_materias
      for select to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'profesor_materias' and policyname = 'administradores gestionan profesor_materias'
  ) then
    create policy "administradores gestionan profesor_materias" on public.profesor_materias
      for all to authenticated
      using (public.es_administrador())
      with check (public.es_administrador());
  end if;
end $$;

-- 3. Backfill inicial: Vincular las materias que los docentes ya tienen registradas en asignaciones
insert into public.profesor_materias (teacher_id, subject_id)
select distinct teacher_id, subject_id
from public.asignaciones_docentes
where teacher_id is not null and subject_id is not null
on conflict (teacher_id, subject_id) do nothing;

-- 4. Desactivar trigger automático antiguo que generaba franjas artificiales rígidas
-- Ahora la creación y edición de horarios se gestiona de forma interactiva desde la grilla semanal
drop trigger if exists despues_de_asignar_docente on public.asignaciones_docentes;
