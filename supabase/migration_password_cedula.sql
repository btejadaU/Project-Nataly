-- Migración: Asignación de contraseña inicial con cédula y cambio obligatorio de contraseña en primer ingreso.
-- Ejecutar en el SQL Editor de Supabase.

-- 1. Añadir columna must_change_password a perfiles si no existe
alter table public.perfiles add column if not exists must_change_password boolean not null default false;

-- 2. Asegurar que los usuarios autenticados puedan actualizar su propio perfil
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'perfiles' and policyname = 'usuarios actualizan su propio perfil'
  ) then
    create policy "usuarios actualizan su propio perfil" on public.perfiles
      for update to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end $$;

-- 3. Función RPC para marcar la contraseña como actualizada
create or replace function public.marcar_clave_actualizada()
returns boolean
language plpgsql
security definer
set search_path = public
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

-- 4. Función RPC para resolver correo según identificador (cédula, código o correo) tanto para docentes como acudientes
create or replace function public.resolver_identificador_login(login_identifier text, login_role text default null)
returns table (email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text := trim(login_identifier);
begin
  if v_clean = '' then
    return;
  end if;

  -- Si es un correo electrónico, verificar directamente en perfiles
  if v_clean like '%@%' then
    return query
    select p.email
    from public.perfiles p
    where lower(p.email) = lower(v_clean)
    limit 1;
    return;
  end if;

  -- Si el rol es docente (teacher) o no se especificó
  if login_role = 'teacher' or login_role is null then
    return query
    select p.email
    from public.perfiles p
    join public.perfiles_profesores prof on prof.id = p.id
    where prof.document_number = v_clean
    limit 1;
    if found then return; end if;
  end if;

  -- Si el rol es acudiente (guardian) o no se especificó
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

  -- Si el rol es administrador (admin)
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

-- 5. Actualizar la función crear_usuario_por_admin para que use el número de documento como contraseña inicial
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
    values (v_user_id, v_clean_doc, v_clean_phone);
  elsif p_role = 'teacher' then
    insert into public.perfiles_profesores (id, document_number, phone)
    values (v_user_id, v_clean_doc, v_clean_phone);
  end if;

  return v_user_id;
end;
$$;

revoke all on function public.crear_usuario_por_admin(text, text, text, text, text) from public;
grant execute on function public.crear_usuario_por_admin(text, text, text, text, text) to anon, authenticated, service_role;

-- 6. Reparación automática de cuentas ya existentes (evita error HTTP 500 en el servidor Auth de Supabase)
update auth.users
set 
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, '')
where confirmation_token is null 
   or recovery_token is null 
   or email_change_token_new is null 
   or email_change is null;

update auth.identities
set provider_id = user_id::text
where provider = 'email' and provider_id != user_id::text;

-- 7. Función RPC para que un usuario pueda actualizar su número de teléfono
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
