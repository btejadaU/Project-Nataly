-- Project Nataly: perfiles separados por rol.
-- Ejecutar despues de clear_existing_data.sql.

create extension if not exists pgcrypto;
create type public.formato_calificacion as enum ('a_f', 'one_five', 'zero_hundred');

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.perfiles_administradores (
  id uuid primary key references public.perfiles(id) on delete cascade,
  document_number text unique,
  phone text,
  created_at timestamptz not null default now()
);

create table public.perfiles_profesores (
  id uuid primary key references public.perfiles(id) on delete cascade,
  document_number text unique,
  phone text,
  created_at timestamptz not null default now()
);

create table public.perfiles_acudientes (
  id uuid primary key references public.perfiles(id) on delete cascade,
  document_number text unique,
  phone text,
  created_at timestamptz not null default now()
);

create table public.salones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  building text,
  created_at timestamptz not null default now()
);

create table public.grados (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  numeric_level smallint not null unique check (numeric_level between 1 and 12),
  created_at timestamptz not null default now()
);

create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  grado_id uuid not null references public.grados(id) on delete restrict,
  section text not null check (length(section) between 1 and 3),
  salon_id uuid not null references public.salones(id) on delete restrict,
  director_id uuid references public.perfiles_profesores(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (grado_id, section)
);

create table public.asignaturas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text not null,
  icon text,
  color text,
  created_at timestamptz not null default now()
);

create table public.estudiantes (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  document_number text unique,
  student_code text not null unique,
  class_group_id uuid not null references public.cursos(id) on delete restrict,
  guardian_id uuid not null references public.perfiles_acudientes(id) on delete restrict,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.asignaciones_docentes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.perfiles_profesores(id) on delete cascade,
  subject_id uuid not null references public.asignaturas(id) on delete cascade,
  class_group_id uuid not null references public.cursos(id) on delete cascade,
  academic_year integer not null default extract(year from current_date)::integer,
  unique (teacher_id, subject_id, class_group_id, academic_year)
);

create table public.horarios (
  id uuid primary key default gen_random_uuid(),
  class_group_id uuid not null references public.cursos(id) on delete cascade,
  subject_id uuid references public.asignaturas(id) on delete set null,
  teacher_id uuid references public.perfiles_profesores(id) on delete set null,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  topic text,
  is_break boolean not null default false,
  label text
);

create or replace function public.generar_horario_asignacion()
returns trigger language plpgsql security definer set search_path = public
as $$
declare slot_number integer;
begin
  select count(*) into slot_number from public.horarios where class_group_id = new.class_group_id;
  insert into public.horarios (class_group_id, subject_id, teacher_id, day_of_week, start_time, end_time)
  values (new.class_group_id, new.subject_id, new.teacher_id, 1 + (slot_number % 5), time '07:00' + make_interval(hours => (slot_number % 4) * 2), time '08:30' + make_interval(hours => (slot_number % 4) * 2));
  return new;
end;
$$;

create trigger despues_de_asignar_docente after insert on public.asignaciones_docentes
for each row execute procedure public.generar_horario_asignacion();

create table public.configuracion_calificaciones (
  id boolean primary key default true check (id),
  format public.formato_calificacion not null default 'one_five',
  passing_value numeric not null default 3.0,
  updated_by uuid references public.perfiles_administradores(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.configuracion_calificaciones (id) values (true) on conflict (id) do nothing;

create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject_id uuid not null references public.asignaturas(id) on delete restrict,
  class_group_id uuid not null references public.cursos(id) on delete restrict,
  teacher_id uuid not null references public.perfiles_profesores(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'graded', 'notified'))
);

create table public.calificaciones (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.tareas(id) on delete cascade,
  student_id uuid not null references public.estudiantes(id) on delete cascade,
  score numeric,
  letter_grade text,
  teacher_note text,
  ai_message text,
  is_notified boolean not null default false,
  notified_at timestamptz,
  is_read boolean not null default false,
  read_at timestamptz,
  unique (assignment_id, student_id),
  check (score is null or score >= 0),
  check (letter_grade is null or letter_grade in ('A', 'B', 'C', 'D', 'F'))
);

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.perfiles_acudientes(id) on delete cascade,
  student_id uuid references public.estudiantes(id) on delete cascade,
  assignment_id uuid references public.tareas(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create type public.estado_asistencia as enum ('presente', 'ausente', 'tardanza', 'justificada');

create table public.asistencias (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.estudiantes(id) on delete cascade,
  class_group_id uuid not null references public.cursos(id) on delete cascade,
  subject_id uuid references public.asignaturas(id) on delete set null,
  teacher_id uuid references public.perfiles_profesores(id) on delete set null,
  date date not null default current_date,
  status public.estado_asistencia not null default 'presente',
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, class_group_id, subject_id, date)
);

create or replace function public.notificar_falta_estudiante()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_guardian_id uuid;
  v_student_name text;
  v_subject_name text;
begin
  if new.status in ('ausente', 'tardanza') then
    select guardian_id, full_name into v_guardian_id, v_student_name
    from public.estudiantes
    where id = new.student_id;

    if new.subject_id is not null then
      select name into v_subject_name from public.asignaturas where id = new.subject_id;
    else
      v_subject_name := 'la jornada escolar';
    end if;

    if v_guardian_id is not null then
      insert into public.notificaciones (
        recipient_id,
        student_id,
        title,
        message,
        is_read
      ) values (
        v_guardian_id,
        new.student_id,
        case when new.status = 'ausente' then 'Alerta de Inasistencia' else 'Reporte de Llegada Tarde' end,
        case when new.status = 'ausente'
          then 'Se registró una inasistencia para ' || split_part(v_student_name, ' ', 1) || ' a la clase de ' || coalesce(v_subject_name, 'clase') || ' el día ' || to_char(new.date, 'DD/MM/YYYY') || '.' || coalesce(' Observación: ' || new.note, '')
          else 'Se registró una llegada tarde de ' || split_part(v_student_name, ' ', 1) || ' en ' || coalesce(v_subject_name, 'clase') || ' el día ' || to_char(new.date, 'DD/MM/YYYY') || '.'
        end,
        false
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger despues_de_registrar_asistencia
after insert or update of status on public.asistencias
for each row execute procedure public.notificar_falta_estudiante();

create or replace function public.notificar_nueva_tarea()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_subject_name text;
  v_student record;
begin
  select name into v_subject_name from public.asignaturas where id = new.subject_id;

  for v_student in
    select id, guardian_id, full_name
    from public.estudiantes
    where class_group_id = new.class_group_id and guardian_id is not null
  loop
    insert into public.notificaciones (
      recipient_id,
      student_id,
      assignment_id,
      title,
      message,
      is_read
    ) values (
      v_student.guardian_id,
      v_student.id,
      new.id,
      'Nueva Tarea: ' || new.title,
      'Se ha asignado una nueva tarea en ' || coalesce(v_subject_name, 'la materia') || ': "' || new.title || '"' ||
      case when new.due_date is not null then '. Fecha de entrega: ' || to_char(new.due_date, 'DD/MM/YYYY') else '.' end,
      false
    );
  end loop;

  return new;
end;
$$;

create trigger despues_de_crear_tarea
after insert on public.tareas
for each row execute procedure public.notificar_nueva_tarea();

create or replace function public.al_crear_usuario()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, full_name, email, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), new.email, new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.al_crear_usuario();

create or replace function public.resolver_inicio_acudiente(login_identifier text)
returns table (email text)
language sql security definer set search_path = public
as $$
  select p.email
  from public.perfiles p
  join public.perfiles_acudientes a on a.id = p.id
  where lower(p.email) = lower(trim(login_identifier))
     or a.document_number = trim(login_identifier)
     or exists (select 1 from public.estudiantes e where e.guardian_id = a.id and (e.student_code = trim(login_identifier) or e.document_number = trim(login_identifier)))
  limit 1;
$$;
create or replace function public.resolver_identificador_login(login_identifier text, login_role text default null)
returns table (email text)
language plpgsql security definer set search_path = public
as $$
declare
  v_clean text := trim(login_identifier);
begin
  if v_clean = '' then
    return;
  end if;

  if v_clean like '%@%' then
    return query
    select p.email
    from public.perfiles p
    where lower(p.email) = lower(v_clean)
    limit 1;
    return;
  end if;

  if login_role = 'teacher' or login_role is null then
    return query
    select p.email
    from public.perfiles p
    join public.perfiles_profesores prof on prof.id = p.id
    where prof.document_number = v_clean
    limit 1;
    if found then return; end if;
  end if;

  if login_role = 'guardian' or login_role is null then
    return query
    select p.email
    from public.perfiles p
    join public.perfiles_acudientes a on a.id = p.id
    where a.document_number = v_clean
       or exists (
         select 1 from public.estudiantes e
         where e.guardian_id = a.id
           and (e.student_code = v_clean or e.document_number = v_clean)
       )
    limit 1;
    if found then return; end if;
  end if;

  if login_role = 'admin' or login_role is null then
    return query
    select p.email
    from public.perfiles p
    join public.perfiles_administradores adm on adm.id = p.id
    where adm.document_number = v_clean
    limit 1;
    if found then return; end if;
  end if;
end;
$$;
revoke all on function public.resolver_identificador_login(text, text) from public;
grant execute on function public.resolver_identificador_login(text, text) to anon, authenticated;

create or replace function public.marcar_clave_actualizada()
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  update public.perfiles
  set must_change_password = false
  where id = auth.uid();
  return true;
end;
$$;
revoke all on function public.marcar_clave_actualizada() from public;
grant execute on function public.marcar_clave_actualizada() to authenticated;

create policy "usuarios leen su perfil" on public.perfiles for select to authenticated using (id = auth.uid() or public.es_administrador());
create policy "usuarios actualizan su propio perfil" on public.perfiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "administradores gestionan perfiles" on public.perfiles for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "usuarios leen su rol" on public.perfiles_administradores for select to authenticated using (id = auth.uid() or public.es_administrador());
create policy "administradores gestionan administradores" on public.perfiles_administradores for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "usuarios leen profesores" on public.perfiles_profesores for select to authenticated using (true);
create policy "administradores gestionan profesores" on public.perfiles_profesores for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "acudientes leen su rol" on public.perfiles_acudientes for select to authenticated using (id = auth.uid() or public.es_administrador());
create policy "administradores gestionan acudientes" on public.perfiles_acudientes for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "usuarios leen salones" on public.salones for select to authenticated using (true);
create policy "administradores gestionan salones" on public.salones for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "usuarios leen grados" on public.grados for select to authenticated using (true);
create policy "administradores gestionan grados" on public.grados for all to authenticated using (public.es_administrador()) with check (public.es_administrador());

create policy "usuarios leen cursos" on public.cursos for select to authenticated using (true);
create policy "administradores gestionan cursos" on public.cursos for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "usuarios leen asignaturas" on public.asignaturas for select to authenticated using (true);
create policy "administradores gestionan asignaturas" on public.asignaturas for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "usuarios leen estudiantes permitidos" on public.estudiantes for select to authenticated using (guardian_id = auth.uid() or public.es_administrador() or exists (select 1 from public.asignaciones_docentes a where a.teacher_id = auth.uid() and a.class_group_id = estudiantes.class_group_id));
create policy "administradores gestionan estudiantes" on public.estudiantes for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "usuarios leen asignaciones docentes" on public.asignaciones_docentes for select to authenticated using (true);
create policy "administradores gestionan asignaciones docentes" on public.asignaciones_docentes for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "usuarios leen horarios" on public.horarios for select to authenticated using (true);
create policy "administradores gestionan horarios" on public.horarios for all to authenticated using (public.es_administrador()) with check (public.es_administrador());
create policy "usuarios leen tareas permitidas" on public.tareas for select to authenticated using (public.es_administrador() or teacher_id = auth.uid() or exists (select 1 from public.estudiantes e where e.class_group_id = tareas.class_group_id and e.guardian_id = auth.uid()));
create policy "profesores crean tareas" on public.tareas for insert to authenticated with check (teacher_id = auth.uid() and public.es_profesor());
create policy "profesores actualizan tareas" on public.tareas for update to authenticated using (teacher_id = auth.uid() or public.es_administrador()) with check (teacher_id = auth.uid() or public.es_administrador());
create policy "usuarios leen calificaciones permitidas" on public.calificaciones for select to authenticated using (public.es_administrador() or exists (select 1 from public.tareas t where t.id = assignment_id and t.teacher_id = auth.uid()) or exists (select 1 from public.estudiantes e where e.id = student_id and e.guardian_id = auth.uid()));
create policy "profesores gestionan calificaciones" on public.calificaciones for all to authenticated using (public.es_administrador() or exists (select 1 from public.tareas t where t.id = assignment_id and t.teacher_id = auth.uid())) with check (public.es_administrador() or exists (select 1 from public.tareas t where t.id = assignment_id and t.teacher_id = auth.uid()));
create policy "acudientes leen notificaciones" on public.notificaciones for select to authenticated using (recipient_id = auth.uid());
create policy "acudientes actualizan notificaciones" on public.notificaciones for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "usuarios leen configuracion" on public.configuracion_calificaciones for select to authenticated using (true);
create policy "administradores gestionan configuracion" on public.configuracion_calificaciones for all to authenticated using (public.es_administrador()) with check (public.es_administrador());

create policy "usuarios leen asistencias permitidas" on public.asistencias for select to authenticated using (
  public.es_administrador()
  or teacher_id = auth.uid()
  or exists (select 1 from public.estudiantes e where e.id = asistencias.student_id and e.guardian_id = auth.uid())
);
create policy "profesores gestionan asistencias" on public.asistencias for all to authenticated using (
  public.es_administrador() or teacher_id = auth.uid() or public.es_profesor()
) with check (
  public.es_administrador() or teacher_id = auth.uid() or public.es_profesor()
);

-- Despues de crear el primer usuario en Authentication:
-- insert into public.perfiles_administradores (id) select id from public.perfiles where email = 'admin@tu-colegio.edu.co';

-- Permite al acudiente confirmar la lectura (firma) de una calificación de su estudiante
-- sin concederle permisos de escritura sobre otras columnas de calificaciones.
create or replace function public.confirmar_lectura_calificacion(p_assignment_id uuid, p_student_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.estudiantes e where e.id = p_student_id and e.guardian_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  update public.calificaciones set is_read = true, read_at = now()
   where assignment_id = p_assignment_id and student_id = p_student_id;
  update public.notificaciones set is_read = true
   where assignment_id = p_assignment_id and student_id = p_student_id and recipient_id = auth.uid();
end;
$$;
revoke all on function public.confirmar_lectura_calificacion(uuid, uuid) from public;
grant execute on function public.confirmar_lectura_calificacion(uuid, uuid) to authenticated;

-- Tabla de configuración institucional y actualización de versión (APK)
create table if not exists public.configuracion (
  id int4 primary key default 1,
  version_minima text not null default '0.0.1',
  url_actualizacion text,
  created_at timestamptz not null default now()
);

insert into public.configuracion (id, version_minima, url_actualizacion)
values (1, '0.0.1', null)
on conflict (id) do nothing;

alter table public.configuracion enable row level security;

-- Permitir lectura a cualquier cliente (incluso antes de autenticarse) para verificación de versión
create policy "lectura publica de configuracion" on public.configuracion
  for select to public
  using (true);

-- Solo administradores pueden modificar versión mínima o URL de descarga
create policy "administradores gestionan configuracion general" on public.configuracion
  for all to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- Permite a un administrador registrar acudientes o profesores directamente sin requerir Edge Functions
create or replace function public.crear_usuario_por_admin(
  p_full_name text,
  p_email text,
  p_document_number text default null,
  p_phone text default null,
  p_role text default 'guardian'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_clean_email text;
  v_clean_doc text;
  v_clean_phone text;
begin
  if not public.es_administrador() then
    raise exception 'Solo un administrador puede crear usuarios.';
  end if;

  if p_role not in ('guardian', 'teacher') then
    raise exception 'Rol no válido. Debe ser guardian o teacher.';
  end if;

  v_clean_email := lower(trim(p_email));
  v_clean_doc := nullif(trim(p_document_number), '');
  v_clean_phone := nullif(trim(p_phone), '');

  -- Validar si el correo ya existe
  if exists (select 1 from auth.users where lower(email) = v_clean_email) then
    raise exception 'duplicate key value violates unique constraint "users_email_key"';
  end if;

  -- Validar documento único según el rol
  if v_clean_doc is null then
    raise exception 'El número de documento (cédula) es obligatorio para crear el usuario.';
  end if;

  -- Validar si el correo ya existe
  if exists (select 1 from auth.users where lower(email) = v_clean_email) then
    raise exception 'duplicate key value violates unique constraint "users_email_key"';
  end if;

  -- Validar documento único según el rol
  if p_role = 'guardian' and exists (select 1 from public.perfiles_acudientes where document_number = v_clean_doc) then
    raise exception 'duplicate key value violates unique constraint "perfiles_acudientes_document_number_key"';
  elsif p_role = 'teacher' and exists (select 1 from public.perfiles_profesores where document_number = v_clean_doc) then
    raise exception 'duplicate key value violates unique constraint "perfiles_profesores_document_number_key"';
  end if;

  v_user_id := gen_random_uuid();

  -- Insertar en auth.users con contraseña igual al documento (cifrada con crypt y salt blowfish)
  -- Nota: GoTrue (Supabase Auth) requiere campos de token no-nulos ('') para evitar error 500 en el login
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_clean_email,
    crypt(v_clean_doc, gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', trim(p_full_name)),
    false,
    now(),
    now()
  );

  -- Insertar en auth.identities (provider_id debe ser el user_id para email auth)
  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email),
    'email',
    now(),
    now(),
    now()
  );

  -- Marcar que debe cambiar la contraseña en su primer inicio
  update public.perfiles
  set must_change_password = true
  where id = v_user_id;

  -- Insertar en la tabla de rol correspondiente
  if p_role = 'guardian' then
    insert into public.perfiles_acudientes (id, document_number, phone)
    values (v_user_id, v_clean_doc, v_clean_phone)
    on conflict (id) do update set document_number = excluded.document_number, phone = excluded.phone;
  else
    insert into public.perfiles_profesores (id, document_number, phone)
    values (v_user_id, v_clean_doc, v_clean_phone)
    on conflict (id) do update set document_number = excluded.document_number, phone = excluded.phone;
  end if;

  return v_user_id;
end;
$$;

revoke all on function public.crear_usuario_por_admin(text, text, text, text, text) from public;
grant execute on function public.crear_usuario_por_admin(text, text, text, text, text) to anon, authenticated, service_role;

-- Permite a un administrador eliminar un usuario por completo
create or replace function public.eliminar_usuario_por_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.es_administrador() then
    raise exception 'Solo un administrador puede eliminar usuarios.';
  end if;

  -- Borra de auth.users, lo que por cascada borra perfiles, perfiles_acudientes o perfiles_profesores
  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.eliminar_usuario_por_admin(uuid) to anon, authenticated, service_role;

-- Permite a cualquier usuario actualizar su número de teléfono
create or replace function public.actualizar_telefono_usuario(p_phone text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text := nullif(trim(p_phone), '');
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  update public.perfiles_acudientes set phone = v_clean where id = auth.uid();
  update public.perfiles_profesores set phone = v_clean where id = auth.uid();
  update public.perfiles_administradores set phone = v_clean where id = auth.uid();
  return true;
end;
$$;

revoke all on function public.actualizar_telefono_usuario(text) from public;
grant execute on function public.actualizar_telefono_usuario(text) to authenticated;

notify pgrst, 'reload schema';


