-- Datos de prueba para Project Nataly.
-- Ejecutar en el Editor SQL de Supabase después de schema.sql.
--
-- CUENTAS DE ACCESO LISTAS PARA PRUEBAS:
-- Contraseña universal de todas las cuentas: PruebaNataly2026!
--
-- 1. ADMINISTRADOR:
--    Correo: admin@colegioejemplo.edu.co  |  Clave: PruebaNataly2026!
-- 2. DOCENTE:
--    Correo: alejandro.ramirez@colegioejemplo.edu.co  |  Clave: PruebaNataly2026!
-- 3. ACUDIENTE:
--    Correo: patricia.rodriguez@colegioejemplo.edu.co  |  Clave: PruebaNataly2026!
--    (También puede entrar usando DNI: 1002002001 o Código de estudiante: COL-7A-001)

begin;

-- ==============================================================================
-- 1. CONFIGURACIÓN GENERAL Y ESCALA DE CALIFICACIONES
-- ==============================================================================
insert into public.configuracion (id, version_minima, url_actualizacion)
values (1, '0.0.1', null)
on conflict (id) do update set version_minima = '0.0.1';

insert into public.configuracion_calificaciones (id, format, passing_value)
values (true, 'one_five', 3.0)
on conflict (id) do nothing;

-- ==============================================================================
-- 2. SALONES FÍSICOS
-- ==============================================================================
insert into public.salones (id, name, building)
values
  ('50000000-0000-0000-0000-000000000001', 'Aula 102', 'Bloque A - Piso 1'),
  ('50000000-0000-0000-0000-000000000002', 'Aula 104', 'Bloque A - Piso 1'),
  ('50000000-0000-0000-0000-000000000003', 'Aula 201', 'Bloque B - Piso 2'),
  ('50000000-0000-0000-0000-000000000004', 'Aula 203', 'Bloque B - Piso 2'),
  ('50000000-0000-0000-0000-000000000005', 'Aula 205', 'Bloque B - Piso 2')
on conflict (id) do nothing;

-- ==============================================================================
-- 3. GRADOS Y CURSOS
-- ==============================================================================
insert into public.grados (id, name, numeric_level)
values
  ('60000000-0000-0000-0000-000000000001', 'Séptimo', 7),
  ('60000000-0000-0000-0000-000000000002', 'Octavo', 8),
  ('60000000-0000-0000-0000-000000000003', 'Noveno', 9)
on conflict (id) do nothing;

insert into public.cursos (id, grado_id, section, salon_id)
values
  ('10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'A', '50000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'B', '50000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 'A', '50000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', 'B', '50000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000003', 'A', '50000000-0000-0000-0000-000000000005')
on conflict (id) do nothing;

-- ==============================================================================
-- 4. ASIGNATURAS
-- ==============================================================================
insert into public.asignaturas (id, name, short_name, icon, color)
values
  ('20000000-0000-0000-0000-000000000001', 'Lengua Castellana', 'Español', 'BookOpen', 'amber'),
  ('20000000-0000-0000-0000-000000000002', 'Inglés', 'Inglés', 'Languages', 'blue'),
  ('20000000-0000-0000-0000-000000000003', 'Matemáticas', 'Matemáticas', 'Calculator', 'purple'),
  ('20000000-0000-0000-0000-000000000004', 'Ética y Valores', 'Ética', 'HeartHandshake', 'emerald')
on conflict (id) do nothing;

-- ==============================================================================
-- 5. USUARIOS EN AUTHENTICATION (Admin, Profesores, Acudientes)
-- ==============================================================================
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  -- Administrador Principal
  ('30000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Coordinación Académica"}', now(), now()),

  -- Profesores
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alejandro.ramirez@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alejandro Ramírez"}', now(), now()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'juliana.castro@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Juliana Castro"}', now(), now()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'felipe.torres@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Felipe Torres"}', now(), now()),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'laura.mendoza@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Laura Mendoza"}', now(), now()),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ricardo.suarez@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ricardo Suárez"}', now(), now()),

  -- Acudientes
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patricia.rodriguez@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Patricia Rodríguez"}', now(), now()),
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mauricio.lopez@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mauricio López"}', now(), now()),
  ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adriana.martinez@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Adriana Martínez"}', now(), now()),
  ('30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carmen.herrera@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carmen Herrera"}', now(), now()),
  ('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ricardo.sanchez@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ricardo Sánchez"}', now(), now()),
  ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'martha.moreno@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Martha Moreno"}', now(), now()),
  ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'roberto.gomez@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Roberto Gómez"}', now(), now()),
  ('30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teresa.vargas@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Teresa Vargas"}', now(), now()),
  ('30000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'beatriz.restrepo@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Beatriz Restrepo"}', now(), now()),
  ('30000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jose.perez@colegioejemplo.edu.co', crypt('PruebaNataly2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"José Pérez"}', now(), now())
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('30000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000000', 'admin@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000000","email":"admin@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'alejandro.ramirez@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000001","email":"alejandro.ramirez@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'juliana.castro@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000002","email":"juliana.castro@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'felipe.torres@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000003","email":"felipe.torres@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'laura.mendoza@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000004","email":"laura.mendoza@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 'ricardo.suarez@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000005","email":"ricardo.suarez@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', 'patricia.rodriguez@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000006","email":"patricia.rodriguez@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000007', 'mauricio.lopez@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000007","email":"mauricio.lopez@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000008', 'adriana.martinez@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000008","email":"adriana.martinez@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000009', 'carmen.herrera@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000009","email":"carmen.herrera@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000010', 'ricardo.sanchez@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000010","email":"ricardo.sanchez@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011', 'martha.moreno@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000011","email":"martha.moreno@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000012', 'roberto.gomez@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000012","email":"roberto.gomez@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000013', 'teresa.vargas@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000013","email":"teresa.vargas@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000014', 'beatriz.restrepo@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000014","email":"beatriz.restrepo@colegioejemplo.edu.co"}', 'email', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000015', 'jose.perez@colegioejemplo.edu.co', '{"sub":"30000000-0000-0000-0000-000000000015","email":"jose.perez@colegioejemplo.edu.co"}', 'email', now(), now(), now())
on conflict (provider, provider_id) do nothing;

-- ==============================================================================
-- 6. ASIGNACIÓN DE ROLES EN SUS TABLAS RESPECTIVAS
-- ==============================================================================
-- Rol Administrador
insert into public.perfiles_administradores (id, document_number, phone)
values
  ('30000000-0000-0000-0000-000000000000', '1000000000', '+57 300 000 0000')
on conflict (id) do nothing;

-- Roles Profesores
insert into public.perfiles_profesores (id, document_number, phone)
values
  ('30000000-0000-0000-0000-000000000001', '1001001001', '+57 310 100 1001'),
  ('30000000-0000-0000-0000-000000000002', '1001001002', '+57 310 100 1002'),
  ('30000000-0000-0000-0000-000000000003', '1001001003', '+57 310 100 1003'),
  ('30000000-0000-0000-0000-000000000004', '1001001004', '+57 310 100 1004'),
  ('30000000-0000-0000-0000-000000000005', '1001001005', '+57 310 100 1005')
on conflict (id) do nothing;

-- Roles Acudientes
insert into public.perfiles_acudientes (id, document_number, phone)
values
  ('30000000-0000-0000-0000-000000000006', '1002002001', '+57 310 200 2001'),
  ('30000000-0000-0000-0000-000000000007', '1002002002', '+57 310 200 2002'),
  ('30000000-0000-0000-0000-000000000008', '1002002003', '+57 310 200 2003'),
  ('30000000-0000-0000-0000-000000000009', '1002002004', '+57 310 200 2004'),
  ('30000000-0000-0000-0000-000000000010', '1002002005', '+57 310 200 2005'),
  ('30000000-0000-0000-0000-000000000011', '1002002006', '+57 310 200 2006'),
  ('30000000-0000-0000-0000-000000000012', '1002002007', '+57 310 200 2007'),
  ('30000000-0000-0000-0000-000000000013', '1002002008', '+57 310 200 2008'),
  ('30000000-0000-0000-0000-000000000014', '1002002009', '+57 310 200 2009'),
  ('30000000-0000-0000-0000-000000000015', '1002002010', '+57 310 200 2010')
on conflict (id) do nothing;

-- ==============================================================================
-- 7. ESTUDIANTES VINCULADOS A SUS CURSOS Y ACUDIENTES
-- ==============================================================================
insert into public.estudiantes (id, full_name, document_number, student_code, class_group_id, guardian_id, status)
values
  ('40000000-0000-0000-0000-000000000001', 'María José Rodríguez', '1101001001', 'COL-7A-001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006', 'active'),
  ('40000000-0000-0000-0000-000000000002', 'Juan Sebastián López', '1101001002', 'COL-7A-002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', 'active'),
  ('40000000-0000-0000-0000-000000000003', 'Valeria Martínez', '1101001003', 'COL-7B-001', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000008', 'active'),
  ('40000000-0000-0000-0000-000000000004', 'Nicolás Herrera', '1101001004', 'COL-7B-002', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000009', 'active'),
  ('40000000-0000-0000-0000-000000000005', 'Gabriela Sánchez', '1101001005', 'COL-8A-001', '10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000010', 'active'),
  ('40000000-0000-0000-0000-000000000006', 'Daniel Moreno', '1101001006', 'COL-8A-002', '10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000011', 'active'),
  ('40000000-0000-0000-0000-000000000007', 'Laura Gómez', '1101001007', 'COL-8B-001', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000012', 'active'),
  ('40000000-0000-0000-0000-000000000008', 'Miguel Ángel Vargas', '1101001008', 'COL-8B-002', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000013', 'active'),
  ('40000000-0000-0000-0000-000000000009', 'Camilo Restrepo', '1101001009', 'COL-9A-001', '10000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000014', 'active'),
  ('40000000-0000-0000-0000-000000000010', 'Ana María Pérez', '1101001010', 'COL-9A-002', '10000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000015', 'active')
on conflict (id) do nothing;

-- ==============================================================================
-- 8. ASIGNACIONES DOCENTES (Genera horarios automáticos por trigger)
-- ==============================================================================
insert into public.asignaciones_docentes (teacher_id, subject_id, class_group_id)
values
  -- Alejandro Ramírez (Matemáticas en 7°A y 9°A)
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005'),

  -- Juliana Castro (Español en 7°A y 8°A)
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'),

  -- Felipe Torres (Inglés en 7°A y 9°A)
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005'),

  -- Laura Mendoza (Ética en 7°A)
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001')
on conflict (teacher_id, subject_id, class_group_id, academic_year) do nothing;

-- ==============================================================================
-- 9. TAREAS ACADÉMICAS
-- ==============================================================================
insert into public.tareas (id, title, description, subject_id, class_group_id, teacher_id, due_date, status)
values
  (
    '70000000-0000-0000-0000-000000000001',
    'Taller de Álgebra y Funciones Lineales',
    'Resolver los ejercicios del 1 al 15 de la guía entregada en clase sobre funciones lineales.',
    '20000000-0000-0000-0000-000000000003', -- Matemáticas
    '10000000-0000-0000-0000-000000000001', -- 7°A
    '30000000-0000-0000-0000-000000000001', -- Alejandro Ramírez
    current_date + interval '3 days',
    'notified'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'Ensayo: La Literatura Medieval Española',
    'Escribir un ensayo reflexivo de mínimo dos páginas analizando los personajes principales del Cantar de Mio Cid.',
    '20000000-0000-0000-0000-000000000001', -- Español
    '10000000-0000-0000-0000-000000000001', -- 7°A
    '30000000-0000-0000-0000-000000000002', -- Juliana Castro
    current_date + interval '5 days',
    'notified'
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    'Oral Presentation: Daily Routines & Hobbies',
    'Preparar una presentación corta en video o en vivo sobre tu rutina diaria y pasatiempos en inglés.',
    '20000000-0000-0000-0000-000000000002', -- Inglés
    '10000000-0000-0000-0000-000000000001', -- 7°A
    '30000000-0000-0000-0000-000000000003', -- Felipe Torres
    current_date + interval '7 days',
    'pending'
  )
on conflict (id) do nothing;

-- ==============================================================================
-- 10. CALIFICACIONES DE PRUEBA
-- ==============================================================================
insert into public.calificaciones (
  assignment_id, student_id, score, teacher_note, ai_message,
  is_notified, notified_at, is_read, read_at
)
values
  (
    '70000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001', -- María José Rodríguez
    4.8,
    'Excelente procedimiento algebraico y entrega puntual.',
    'Dominio sobresaliente en resolución de funciones lineales.',
    true, now() - interval '1 day', false, null
  ),
  (
    '70000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002', -- Juan Sebastián López
    3.8,
    'Buen esfuerzo, reforzar la comprobación de los últimos ejercicios.',
    'Progreso positivo en matemáticas, requiere afianzar despejes.',
    true, now() - interval '1 day', true, now() - interval '12 hours'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001', -- María José Rodríguez
    4.5,
    'Redacción fluida con argumentos bien fundamentados.',
    'Destacada capacidad de análisis literario.',
    true, now() - interval '2 days', true, now() - interval '1 day'
  )
on conflict (assignment_id, student_id) do nothing;

-- ==============================================================================
-- 11. HISTORIAL DE ASISTENCIAS (Para cálculo de % y alertas)
-- ==============================================================================
insert into public.asistencias (
  student_id, class_group_id, subject_id, teacher_id, date, status, note
)
values
  -- Historial para María José Rodríguez (7°A) en Matemáticas
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date, 'presente', 'Asistencia puntual'),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date - 1, 'presente', null),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date - 2, 'presente', null),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date - 3, 'tardanza', 'Llegó 15 minutos tarde por congestión vehicular'),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date - 4, 'presente', null),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date - 5, 'ausente', 'Cita médica odontológica programada'),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date - 6, 'presente', null),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date - 7, 'justificada', 'Incapacidad médica presentada por acudiente'),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date - 8, 'presente', null),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date - 9, 'presente', null),

  -- Asistencias para Juan Sebastián López (7°A) en Matemáticas
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date, 'presente', null),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', current_date - 1, 'presente', null)
on conflict (student_id, class_group_id, subject_id, date) do nothing;

-- ==============================================================================
-- 12. NOTIFICACIONES INSTITUCIONALES PARA ACUDIENTES
-- ==============================================================================
-- Nota: La inasistencia insertada arriba dispara automáticamente una alerta vía trigger.
-- Insertamos también avisos de bienvenida y notas informativas:
insert into public.notificaciones (
  recipient_id, student_id, assignment_id, title, message, is_read, created_at
)
values
  (
    '30000000-0000-0000-0000-000000000006', -- Patricia Rodríguez
    '40000000-0000-0000-0000-000000000001', -- María José
    '70000000-0000-0000-0000-000000000001',
    'Calificación publicada en Matemáticas',
    'El docente Alejandro Ramírez publicó la nota del Taller de Álgebra: 4.8 / 5.0.',
    false,
    now() - interval '1 day'
  ),
  (
    '30000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000001',
    null,
    'Bienvenida al Periodo Académico 2026',
    'Estimada familia Rodríguez, les damos la bienvenida al nuevo año escolar en Project Nataly. Recuerden revisar semanalmente el módulo de tareas.',
    true,
    now() - interval '4 days'
  )
on conflict do nothing;

commit;

-- ==============================================================================
-- INSTRUCCIONES ADICIONALES:
-- ==============================================================================
-- Si deseas asignar permisos de Administrador a tu correo personal (por ejemplo, breimartejada@gmail.com):
-- 1. Regístrate o inicia sesión con tu correo en la aplicación.
-- 2. Ejecuta en Supabase esta consulta:
--    insert into public.perfiles_administradores (id)
--    select id from public.perfiles where email = 'breimartejada@gmail.com'
--    on conflict (id) do nothing;

