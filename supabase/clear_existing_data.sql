-- Ejecutar una sola vez antes de pegar schema.sql.
-- ADVERTENCIA: borra las tablas, funciones, tipos enum y todas las cuentas de autenticación.

begin;

-- Desactivar triggers
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists despues_de_asignar_docente on public.asignaciones_docentes;
drop trigger if exists despues_de_registrar_asistencia on public.asistencias;

drop function if exists public.crear_usuario_por_admin(text, text, text, text, text) cascade;
drop function if exists public.eliminar_usuario_por_admin(uuid) cascade;
drop function if exists public.notificar_falta_estudiante() cascade;
drop function if exists public.generar_horario_asignacion() cascade;
drop function if exists public.confirmar_lectura_calificacion(uuid, uuid) cascade;
drop function if exists public.resolver_inicio_acudiente(text) cascade;
drop function if exists public.resolve_guardian_login(text) cascade;
drop function if exists public.es_administrador() cascade;
drop function if exists public.es_profesor() cascade;
drop function if exists public.es_acudiente() cascade;
drop function if exists public.al_crear_usuario() cascade;
drop function if exists public.handle_new_user() cascade;

-- Eliminar tablas
drop table if exists
  public.asistencias,
  public.notificaciones,
  public.calificaciones,
  public.tareas,
  public.horarios,
  public.asignaciones_docentes,
  public.estudiantes,
  public.cursos,
  public.grados,
  public.salones,
  public.asignaturas,
  public.configuracion_calificaciones,
  public.configuracion,
  public.perfiles_acudientes,
  public.perfiles_profesores,
  public.perfiles_administradores,
  public.perfiles,
  public.notifications,
  public.assignment_grades,
  public.assignments,
  public.schedule_entries,
  public.teacher_assignments,
  public.students,
  public.class_groups,
  public.subjects,
  public.grading_settings,
  public.profiles
cascade;

-- Eliminar tipos enum
drop type if exists public.estado_asistencia cascade;
drop type if exists public.formato_calificacion cascade;
drop type if exists public.rol_aplicacion cascade;
drop type if exists public.grading_format cascade;
drop type if exists public.app_role cascade;

-- Eliminar cuentas e identidades de Authentication
delete from auth.identities;
delete from auth.users;

commit;
