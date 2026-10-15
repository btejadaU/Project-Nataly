-- Migración: Tabla de Apelaciones y Revisión de Calificaciones
-- Ejecutar en el SQL Editor de Supabase si se desea persistencia nativa en BD

-- 1. Crear tipo de estado para apelaciones si no existe
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_apelacion') then
    create type public.estado_apelacion as enum (
      'CALIFICADA',
      'EN_REVISION',
      'REVISION_ACEPTADA',
      'REVISION_RECHAZADA'
    );
  end if;
end $$;

-- 2. Funciones auxiliares de verificación de roles seguras (si no existen)
create or replace function public.es_administrador()
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (select 1 from public.perfiles_administradores where id = auth.uid());
$$;

create or replace function public.es_profesor()
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (select 1 from public.perfiles_profesores where id = auth.uid());
$$;

-- 3. Crear tabla de apelaciones de calificaciones
create table if not exists public.apelaciones_calificaciones (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.tareas(id) on delete cascade,
  student_id uuid not null references public.estudiantes(id) on delete cascade,
  guardian_id uuid references public.perfiles(id) on delete set null,
  teacher_id uuid references public.perfiles(id) on delete set null,
  subject_id uuid references public.asignaturas(id) on delete set null,
  class_group_id uuid references public.cursos(id) on delete set null,
  reason text not null,
  status text not null default 'EN_REVISION' check (status in ('CALIFICADA', 'EN_REVISION', 'REVISION_ACEPTADA', 'REVISION_RECHAZADA')),
  teacher_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

-- Asegurar que las llaves foráneas no restrinjan si guardian_id o teacher_id apuntan a perfiles generales
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'apelaciones_calificaciones_guardian_id_fkey'
      and table_name = 'apelaciones_calificaciones'
  ) then
    alter table public.apelaciones_calificaciones drop constraint apelaciones_calificaciones_guardian_id_fkey;
    alter table public.apelaciones_calificaciones
      add constraint apelaciones_calificaciones_guardian_id_fkey
      foreign key (guardian_id) references public.perfiles(id) on delete set null;
  end if;

  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'apelaciones_calificaciones_teacher_id_fkey'
      and table_name = 'apelaciones_calificaciones'
  ) then
    alter table public.apelaciones_calificaciones drop constraint apelaciones_calificaciones_teacher_id_fkey;
    alter table public.apelaciones_calificaciones
      add constraint apelaciones_calificaciones_teacher_id_fkey
      foreign key (teacher_id) references public.perfiles(id) on delete set null;
  end if;
end $$;

-- 4. Habilitar Row Level Security (RLS)
alter table public.apelaciones_calificaciones enable row level security;

-- 5. Políticas de acceso seguras y compatibles con .upsert()
-- INSERCIÓN: Permitida a usuarios autenticados.
-- En PostgreSQL / Supabase, las operaciones .upsert() (INSERT ... ON CONFLICT DO UPDATE)
-- requieren obligatoriamente que la política de INSERT sea satisfecha tanto por acudientes
-- al abrir la apelación como por docentes/administradores al resolverla o cambiar su estado.
drop policy if exists "acudientes insertan apelaciones" on public.apelaciones_calificaciones;
drop policy if exists "usuarios autenticados insertan apelaciones" on public.apelaciones_calificaciones;
create policy "usuarios autenticados insertan apelaciones"
  on public.apelaciones_calificaciones
  for insert
  to authenticated
  with check (true);

-- LECTURA (SELECT): Administradores, profesores, acudiente creador o acudiente vinculado al estudiante
drop policy if exists "usuarios ven apelaciones permitidas" on public.apelaciones_calificaciones;
drop policy if exists "usuarios autenticados ven apelaciones" on public.apelaciones_calificaciones;
create policy "usuarios autenticados ven apelaciones"
  on public.apelaciones_calificaciones
  for select
  to authenticated
  using (
    public.es_administrador()
    or public.es_profesor()
    or teacher_id = auth.uid()
    or guardian_id = auth.uid()
    or exists (select 1 from public.estudiantes e where e.id = student_id and e.guardian_id = auth.uid())
    or exists (select 1 from public.tareas t where t.id = assignment_id and t.teacher_id = auth.uid())
  );

-- ACTUALIZACIÓN (UPDATE): Docentes, acudientes y administradores
drop policy if exists "docentes y acudientes actualizan apelaciones" on public.apelaciones_calificaciones;
drop policy if exists "usuarios autenticados actualizan apelaciones" on public.apelaciones_calificaciones;
create policy "usuarios autenticados actualizan apelaciones"
  on public.apelaciones_calificaciones
  for update
  to authenticated
  using (
    public.es_administrador()
    or public.es_profesor()
    or teacher_id = auth.uid()
    or guardian_id = auth.uid()
    or exists (select 1 from public.estudiantes e where e.id = student_id and e.guardian_id = auth.uid())
    or exists (select 1 from public.tareas t where t.id = assignment_id and t.teacher_id = auth.uid())
  )
  with check (true);

-- Notificar recarga del esquema a PostgREST
notify pgrst, 'reload schema';
