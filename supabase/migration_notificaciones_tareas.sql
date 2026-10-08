-- Migración: Notificaciones automáticas para acudientes al asignar tareas
-- Ejecutar en el SQL Editor de Supabase

-- 1. Asegurar política de inserción en notificaciones para docentes y administradores
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'notificaciones' and policyname = 'usuarios autenticados insertan notificaciones'
  ) then
    create policy "usuarios autenticados insertan notificaciones" on public.notificaciones
      for insert to authenticated
      with check (true);
  end if;
end $$;

-- 2. Función trigger para notificar automáticamente al crear una tarea
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

-- 3. Crear el trigger en la tabla de tareas
drop trigger if exists despues_de_crear_tarea on public.tareas;
create trigger despues_de_crear_tarea
after insert on public.tareas
for each row execute procedure public.notificar_nueva_tarea();

-- 4. Backfill: Crear notificaciones para las tareas existentes que no tengan notificación registrada
insert into public.notificaciones (recipient_id, student_id, assignment_id, title, message, is_read, created_at)
select 
  e.guardian_id,
  e.id as student_id,
  t.id as assignment_id,
  'Nueva Tarea: ' || t.title as title,
  'Se asignó la tarea en ' || coalesce(a.name, 'la materia') || ': "' || t.title || '"' ||
  case when t.due_date is not null then '. Fecha de entrega: ' || to_char(t.due_date, 'DD/MM/YYYY') else '.' end as message,
  false as is_read,
  coalesce(t.assigned_at, now()) as created_at
from public.tareas t
join public.estudiantes e on e.class_group_id = t.class_group_id
left join public.asignaturas a on a.id = t.subject_id
where e.guardian_id is not null
  and not exists (
    select 1 from public.notificaciones n
    where n.assignment_id = t.id and n.student_id = e.id
  );

-- 5. Restringir lectura de notificaciones: sólo el acudiente destinatario puede leerlas (el admin NO tiene acceso)
drop policy if exists "acudientes leen notificaciones" on public.notificaciones;
create policy "acudientes leen notificaciones" on public.notificaciones
  for select to authenticated
  using (recipient_id = auth.uid());

