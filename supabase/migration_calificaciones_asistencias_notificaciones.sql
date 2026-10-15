-- Migración: Notificaciones automáticas por registro de calificaciones y confirmación de asistencia
-- Ejecutar en el SQL Editor de Supabase

-- 1. Trigger de asistencia: Notificar tanto para ausencias/tardanzas como para confirmación de ASISTENCIA (presente)
create or replace function public.notificar_asistencia_completa()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_guardian_id uuid;
  v_student_name text;
  v_subject_name text;
  v_title text;
  v_message text;
begin
  select guardian_id, full_name into v_guardian_id, v_student_name
  from public.estudiantes
  where id = new.student_id;

  if v_guardian_id is null then
    return new;
  end if;

  if new.subject_id is not null then
    select name into v_subject_name from public.asignaturas where id = new.subject_id;
  else
    v_subject_name := 'la jornada escolar';
  end if;

  if new.status = 'presente' then
    v_title := 'Asistencia Registrada';
    v_message := 'Se confirmó la asistencia a clase de ' || split_part(v_student_name, ' ', 1) || ' en ' || coalesce(v_subject_name, 'clase') || ' el día ' || to_char(new.date, 'DD/MM/YYYY') || '.';
  elsif new.status = 'tardanza' then
    v_title := 'Reporte de Llegada Tarde';
    v_message := 'Se registró una llegada tarde de ' || split_part(v_student_name, ' ', 1) || ' en ' || coalesce(v_subject_name, 'clase') || ' el día ' || to_char(new.date, 'DD/MM/YYYY') || '.';
  elsif new.status = 'ausente' then
    v_title := 'Alerta de Inasistencia';
    v_message := 'Se registró una inasistencia para ' || split_part(v_student_name, ' ', 1) || ' en ' || coalesce(v_subject_name, 'clase') || ' el día ' || to_char(new.date, 'DD/MM/YYYY') || '.' || coalesce(' Observación: ' || new.note, '');
  else
    return new;
  end if;

  -- Evitar duplicados para la misma asistencia en el mismo día
  if not exists (
    select 1 from public.notificaciones n
    where n.recipient_id = v_guardian_id
      and n.student_id = new.student_id
      and n.title = v_title
      and n.created_at::date = current_date
  ) then
    insert into public.notificaciones (
      recipient_id,
      student_id,
      title,
      message,
      is_read
    ) values (
      v_guardian_id,
      new.student_id,
      v_title,
      v_message,
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists despues_de_guardar_asistencia on public.asistencias;
create trigger despues_de_guardar_asistencia
after insert or update of status on public.asistencias
for each row execute procedure public.notificar_asistencia_completa();


-- 2. Trigger de calificaciones: Notificar al estudiante y acudiente cuando se registre o actualice una nota
create or replace function public.notificar_calificacion_registrada()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_guardian_id uuid;
  v_student_name text;
  v_task_title text;
  v_subject_name text;
  v_notification_title text;
  v_notification_message text;
begin
  -- Solo notificar si hay un puntaje válido y cambió o es nuevo
  if new.score is null then
    return new;
  end if;

  if (tg_op = 'UPDATE' and old.score is not distinct from new.score) then
    return new;
  end if;

  select e.guardian_id, e.full_name, t.title, a.name
  into v_guardian_id, v_student_name, v_task_title, v_subject_name
  from public.estudiantes e
  join public.tareas t on t.id = new.assignment_id
  left join public.asignaturas a on a.id = t.subject_id
  where e.id = new.student_id;

  if v_guardian_id is null then
    return new;
  end if;

  v_notification_title := 'Calificación Registrada: ' || coalesce(v_task_title, 'Actividad');
  v_notification_message := 'Se ha calificado la actividad "' || coalesce(v_task_title, 'Actividad') || '" en ' ||
    coalesce(v_subject_name, 'la materia') || ' para ' || split_part(v_student_name, ' ', 1) ||
    '. Nota obtenida: ' || to_char(new.score, 'FM999999990.0') || ' / 5.0' ||
    case when new.teacher_note is not null and trim(new.teacher_note) <> '' then '. Comentario: "' || new.teacher_note || '"' else '.' end;

  -- Prevenir duplicaciones inmediatas para la misma tarea y estudiante
  if not exists (
    select 1 from public.notificaciones n
    where n.recipient_id = v_guardian_id
      and n.student_id = new.student_id
      and n.assignment_id = new.assignment_id
      and n.created_at >= now() - interval '30 seconds'
  ) then
    insert into public.notificaciones (
      recipient_id,
      student_id,
      assignment_id,
      title,
      message,
      is_read
    ) values (
      v_guardian_id,
      new.student_id,
      new.assignment_id,
      v_notification_title,
      v_notification_message,
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists despues_de_guardar_calificacion on public.calificaciones;
create trigger despues_de_guardar_calificacion
after insert or update on public.calificaciones
for each row execute procedure public.notificar_calificacion_registrada();
