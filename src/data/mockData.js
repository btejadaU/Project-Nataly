// Datos iniciales de demostración para Project Nataly

export const initialGrades = [
  { id: '6A', name: 'Grado 6°A', salon: 'Aula 101', director: 'Prof. Diana Rojas', totalStudents: 28, building: 'Bloque A - Piso 1' },
  { id: '7B', name: 'Grado 7°B', salon: 'Aula 104', director: 'Prof. Andrés Morales', totalStudents: 26, building: 'Bloque A - Piso 1' },
  { id: '8A', name: 'Grado 8°A', salon: 'Aula 201', director: 'Prof. Carolina Vega', totalStudents: 30, building: 'Bloque B - Piso 2' },
  { id: '9A', name: 'Grado 9°A', salon: 'Aula 205', director: 'Prof. Carlos Mendoza', totalStudents: 8, building: 'Bloque B - Piso 2' }, // Curso demo principal
  { id: '10B', name: 'Grado 10°B', salon: 'Aula 302', director: 'Prof. Roberto Silva', totalStudents: 25, building: 'Bloque C - Piso 3' },
  { id: '11A', name: 'Grado 11°A', salon: 'Aula 305', director: 'Prof. Marcela Pardo', totalStudents: 24, building: 'Bloque C - Piso 3' },
];

export const initialSubjects = [
  { id: 'mat', name: 'Matemáticas y Álgebra', icon: 'Calculator', teacher: 'Prof. Carlos Mendoza', color: 'purple' },
  { id: 'cie', name: 'Ciencias Naturales y Biología', icon: 'FlaskConical', teacher: 'Prof. Diana Rojas', color: 'emerald' },
  { id: 'esp', name: 'Lengua Castellana y Literatura', icon: 'BookOpen', teacher: 'Prof. Marcela Pardo', color: 'amber' },
  { id: 'ing', name: 'Inglés B1 Competitivo', icon: 'Languages', teacher: 'Prof. Andrés Morales', color: 'blue' },
  { id: 'soc', name: 'Ciencias Sociales e Historia', icon: 'Globe2', teacher: 'Prof. Carolina Vega', color: 'rose' },
  { id: 'tec', name: 'Tecnología e Informática', icon: 'Laptop', teacher: 'Prof. Roberto Silva', color: 'cyan' },
];

export const initialTeachers = [
  {
    id: 't-carlos',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@natalyschool.edu.co',
    phone: '+57 311 892 3450',
    subject: 'Matemáticas y Álgebra',
    grades: ['9°A', '8°A', '11°A'],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isMainDemo: true
  },
  {
    id: 't-diana',
    name: 'Diana Rojas',
    email: 'diana.rojas@natalyschool.edu.co',
    phone: '+57 315 223 9012',
    subject: 'Ciencias Naturales y Biología',
    grades: ['6°A', '7°B', '9°A'],
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 't-marcela',
    name: 'Marcela Pardo',
    email: 'marcela.pardo@natalyschool.edu.co',
    phone: '+57 318 765 4321',
    subject: 'Lengua Castellana y Literatura',
    grades: ['9°A', '10°B', '11°A'],
    avatar: 'https://images.unsplash.com/photo-1580894732486-1d15442cebb6?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 't-andres',
    name: 'Andrés Morales',
    email: 'andres.morales@natalyschool.edu.co',
    phone: '+57 312 901 2345',
    subject: 'Inglés B1 Competitivo',
    grades: ['7°B', '9°A'],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 't-carolina',
    name: 'Carolina Vega',
    email: 'carolina.vega@natalyschool.edu.co',
    phone: '+57 316 345 6789',
    subject: 'Ciencias Sociales e Historia',
    grades: ['8°A', '9°A'],
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 't-roberto',
    name: 'Roberto Silva',
    email: 'roberto.silva@natalyschool.edu.co',
    phone: '+57 319 876 5432',
    subject: 'Tecnología e Informática',
    grades: ['9°A', '10°B'],
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  }
];

export const initialStudents = [
  {
    id: 'std-nataly',
    name: 'Nataly Sofía Gómez',
    gradeId: '9A',
    gradeName: '9°A',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    guardianName: 'Sandra Patricia Gómez',
    guardianKinship: 'Madre',
    guardianPhone: '+57 312 456 7890',
    guardianEmail: 'sandra.gomez@gmail.com',
    status: 'Activo',
    isTargetStudent: true
  },
  {
    id: 'std-mateo',
    name: 'Mateo Valencia Cruz',
    gradeId: '9A',
    gradeName: '9°A',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    guardianName: 'Jorge Valencia',
    guardianKinship: 'Padre',
    guardianPhone: '+57 310 987 6543',
    guardianEmail: 'jorge.valencia@empresa.com',
    status: 'Activo'
  },
  {
    id: 'std-valentina',
    name: 'Valentina Rincón Melo',
    gradeId: '9A',
    gradeName: '9°A',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    guardianName: 'Claudia Rincón',
    guardianKinship: 'Madre',
    guardianPhone: '+57 315 321 0987',
    guardianEmail: 'claudia.rincon@outlook.com',
    status: 'Activo'
  },
  {
    id: 'std-santiago',
    name: 'Santiago Herrera Gil',
    gradeId: '9A',
    gradeName: '9°A',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    guardianName: 'Luz Marina Herrera',
    guardianKinship: 'Tía / Tutora',
    guardianPhone: '+57 320 654 9870',
    guardianEmail: 'luz.herrera@correo.com',
    status: 'Activo'
  },
  {
    id: 'std-isabella',
    name: 'Isabella Castro Peña',
    gradeId: '9A',
    gradeName: '9°A',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    guardianName: 'Fernando Castro',
    guardianKinship: 'Padre',
    guardianPhone: '+57 318 432 1098',
    guardianEmail: 'fernando.castro@gmail.com',
    status: 'Activo'
  },
  {
    id: 'std-samuel',
    name: 'Samuel Morales Rios',
    gradeId: '9A',
    gradeName: '9°A',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    guardianName: 'Elena Duarte',
    guardianKinship: 'Madre',
    guardianPhone: '+57 311 765 4321',
    guardianEmail: 'elena.duarte@servicios.com',
    status: 'Activo'
  },
  {
    id: 'std-mariana',
    name: 'Mariana Quintero Leal',
    gradeId: '9A',
    gradeName: '9°A',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    guardianName: 'Carlos Quintero',
    guardianKinship: 'Padre',
    guardianPhone: '+57 316 234 5678',
    guardianEmail: 'carlos.quintero@yahoo.com',
    status: 'Activo'
  },
  {
    id: 'std-tomas',
    name: 'Tomás Bermúdez Orozco',
    gradeId: '9A',
    gradeName: '9°A',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    guardianName: 'Martha Orozco',
    guardianKinship: 'Madre',
    guardianPhone: '+57 314 876 5432',
    guardianEmail: 'martha.orozco@gmail.com',
    status: 'Activo'
  }
];

export const initialSchedule9A = [
  {
    day: 'Lunes',
    periods: [
      { time: '07:00 - 08:30', subject: 'Matemáticas y Álgebra', teacher: 'Prof. Carlos Mendoza', topic: 'Ecuaciones cuadráticas por factorización', homeworkDue: 'Taller preparatorio' },
      { time: '08:30 - 10:00', subject: 'Lengua Castellana', teacher: 'Prof. Marcela Pardo', topic: 'Análisis literario del realismo mágico', homeworkDue: 'Lectura Cap. 3 a 5' },
      { time: '10:00 - 10:30', isBreak: true, label: 'Receso / Desayuno Escolar' },
      { time: '10:30 - 12:00', subject: 'Ciencias Naturales', teacher: 'Prof. Diana Rojas', topic: 'Mecanismos de respiración celular y ATP', homeworkDue: null },
      { time: '12:00 - 01:30', subject: 'Inglés B1', teacher: 'Prof. Andrés Morales', topic: 'Speaking practice: Past continuous vs simple', homeworkDue: 'Vocabulary Quiz' }
    ]
  },
  {
    day: 'Martes',
    periods: [
      { time: '07:00 - 08:30', subject: 'Ciencias Sociales', teacher: 'Prof. Carolina Vega', topic: 'Guerra Fría en América Latina', homeworkDue: null },
      { time: '08:30 - 10:00', subject: 'Matemáticas y Álgebra', teacher: 'Prof. Carlos Mendoza', topic: 'Fórmula general y discriminante', homeworkDue: 'Ejercicios página 42' },
      { time: '10:00 - 10:30', isBreak: true, label: 'Receso / Desayuno Escolar' },
      { time: '10:30 - 12:00', subject: 'Tecnología e Informática', teacher: 'Prof. Roberto Silva', topic: 'Lógica condicional y algoritmos', homeworkDue: 'Diagrama de flujo' },
      { time: '12:00 - 01:30', subject: 'Educación Física', teacher: 'Prof. Javier Soto', topic: 'Acondicionamiento físico y voleibol', homeworkDue: null }
    ]
  },
  {
    day: 'Miércoles',
    periods: [
      { time: '07:00 - 08:30', subject: 'Lengua Castellana', teacher: 'Prof. Marcela Pardo', topic: 'Redacción argumentativa y conectores', homeworkDue: 'Borrador de ensayo' },
      { time: '08:30 - 10:00', subject: 'Ciencias Naturales', teacher: 'Prof. Diana Rojas', topic: 'Laboratorio: Observación de cloroplastos', homeworkDue: 'Pre-informe' },
      { time: '10:00 - 10:30', isBreak: true, label: 'Receso / Desayuno Escolar' },
      { time: '10:30 - 12:00', subject: 'Matemáticas y Álgebra', teacher: 'Prof. Carlos Mendoza', topic: 'Problemas de aplicación práctica', homeworkDue: 'Taller de clase' },
      { time: '12:00 - 01:30', subject: 'Artes Plásticas', teacher: 'Prof. Beatriz Luna', topic: 'Perspectiva con dos puntos de fuga', homeworkDue: null }
    ]
  },
  {
    day: 'Jueves',
    periods: [
      { time: '07:00 - 08:30', subject: 'Inglés B1', teacher: 'Prof. Andrés Morales', topic: 'Listening comprehension & idioms', homeworkDue: 'Worksheet 4' },
      { time: '08:30 - 10:00', subject: 'Ciencias Sociales', teacher: 'Prof. Carolina Vega', topic: 'Geopolítica contemporánea', homeworkDue: 'Mapa conceptual' },
      { time: '10:00 - 10:30', isBreak: true, label: 'Receso / Desayuno Escolar' },
      { time: '10:30 - 12:00', subject: 'Ética y Valores', teacher: 'Prof. Carlos Mendoza', topic: 'Resolución pacífica de dilemas morales', homeworkDue: null },
      { time: '12:00 - 01:30', subject: 'Tecnología e Informática', teacher: 'Prof. Roberto Silva', topic: 'Estructuras de datos en la vida real', homeworkDue: null }
    ]
  },
  {
    day: 'Viernes',
    periods: [
      { time: '07:00 - 08:30', subject: 'Matemáticas y Álgebra', teacher: 'Prof. Carlos Mendoza', topic: 'Repaso y sustentación de trabajos', homeworkDue: 'Entrega final de taller' },
      { time: '08:30 - 10:00', subject: 'Ciencias Naturales', teacher: 'Prof. Diana Rojas', topic: 'Exposiciones sobre biomas colombianos', homeworkDue: 'Diapositivas' },
      { time: '10:00 - 10:30', isBreak: true, label: 'Receso / Desayuno Escolar' },
      { time: '10:30 - 12:00', subject: 'Lengua Castellana', teacher: 'Prof. Marcela Pardo', topic: 'Taller de oratoria y expresión', homeworkDue: null },
      { time: '12:00 - 01:30', subject: 'Dirección de Grupo', teacher: 'Prof. Carlos Mendoza', topic: 'Evaluación de convivencia y acuerdos', homeworkDue: null }
    ]
  }
];

export const initialTasks = [
  {
    id: 'task-1',
    title: 'Taller de Ecuaciones Cuadráticas y Factorización',
    subjectId: 'mat',
    subjectName: 'Matemáticas y Álgebra',
    gradeId: '9A',
    gradeName: '9°A',
    teacherId: 't-carlos',
    teacherName: 'Prof. Carlos Mendoza',
    assignedDate: '2026-09-08',
    dueDate: '2026-09-15',
    description: 'Resolver los 10 ejercicios del módulo 4 justificando el método de despeje y gráfica de la parábola.',
    status: 'Calificada y Notificada',
    studentGrades: {
      'std-nataly': {
        score: 4.8,
        teacherNote: 'Excelente precisión en el desarrollo algebraico. Procedimientos impecables y ordenados.',
        aiMessage: 'Estimada Sandra Patricia: Le extendemos un cordial saludo del cuerpo docente. Nos complace felicitar a Nataly Sofía por su sobresaliente desempeño (4.8/5.0) en el Taller de Ecuaciones Cuadráticas. Demostró gran disciplina y dominio riguroso de cada procedimiento. ¡Continúen apoyando su amor por las matemáticas!',
        notifiedAt: '2026-09-11 14:30',
        isNotified: true,
        isRead: true,
        readAt: '2026-09-11 15:10'
      },
      'std-mateo': {
        score: 2.8,
        teacherNote: 'Omitió los últimos 3 puntos y hubo confusión con la ley de signos en la fórmula general.',
        aiMessage: 'Estimado Jorge Valencia: Un saludo cordial desde la coordinación pedagógica. Le compartimos que Mateo obtuvo una calificación de 2.8/5.0 en el Taller de Ecuaciones Cuadráticas, debido a errores puntuales en la ley de signos y puntos sin completar. Sugerimos repasar los ejercicios 5 al 8 y participar en la asesoría de refuerzo del próximo martes.',
        notifiedAt: '2026-09-11 14:30',
        isNotified: true,
        isRead: false,
        readAt: null
      },
      'std-valentina': {
        score: 4.2,
        teacherNote: 'Buen trabajo, entendió muy bien el método pero faltó graficar el vértice.',
        aiMessage: 'Estimada Claudia Rincón: Le enviamos un saludo fraterno. Le informamos que Valentina alcanzó una buena calificación de 4.2/5.0 en el taller de matemáticas. Demuestra sólida comprensión conceptual; afinando el detalle de las gráficas alcanzará la excelencia.',
        notifiedAt: '2026-09-11 14:30',
        isNotified: true,
        isRead: true,
        readAt: '2026-09-11 16:05'
      },
      'std-santiago': {
        score: 2.5,
        teacherNote: 'No presentó la justificación de los pasos y no culminó la mitad del taller.',
        aiMessage: 'Estimada Luz Marina: Esperamos se encuentre muy bien. Le informamos con interés de apoyo que Santiago obtuvo una nota de 2.5/5.0 en el taller de Álgebra. El taller quedó incompleto en su segunda fase. Confiamos en su potencial e invitamos a acompañarlo en casa para la entrega del plan de mejoramiento.',
        notifiedAt: '2026-09-11 14:30',
        isNotified: true,
        isRead: false,
        readAt: null
      },
      'std-isabella': {
        score: 4.5,
        teacherNote: 'Muy buen análisis y sustentación oral en clase.',
        aiMessage: 'Estimado Fernando Castro: Reciba un cálido saludo. Queremos compartirle la destacada nota de 4.5/5.0 obtenida por Isabella en el taller de ecuaciones. Destacó especialmente por su capacidad para explicar el método a sus compañeros.',
        notifiedAt: '2026-09-11 14:30',
        isNotified: true,
        isRead: true,
        readAt: '2026-09-11 17:22'
      },
      'std-samuel': {
        score: 3.5,
        teacherNote: 'Aprobó con lo justo. Necesita mayor concentración para evitar descuidos de cálculo.',
        aiMessage: 'Estimada Elena Duarte: Un saludo cordial. Le informamos que Samuel obtuvo 3.5/5.0 en su taller de álgebra. Cumplió con los objetivos fundamentales requeridos, aunque recomendamos motivarlo a verificar sus cálculos para consolidar notas superiores.',
        notifiedAt: '2026-09-11 14:30',
        isNotified: true,
        isRead: false,
        readAt: null
      },
      'std-mariana': {
        score: 4.9,
        teacherNote: 'Trabajo perfecto, creatividad en la propuesta de soluciones.',
        aiMessage: 'Estimado Carlos Quintero: Le extendemos nuestras más sinceras felicitaciones por la excelente nota de 4.9/5.0 de Mariana en Matemáticas. Su dedicación, pulcritud y claridad son un ejemplo admirable en el aula.',
        notifiedAt: '2026-09-11 14:30',
        isNotified: true,
        isRead: true,
        readAt: '2026-09-11 14:50'
      },
      'std-tomas': {
        score: 3.2,
        teacherNote: 'Entregó a tiempo pero con dudas en los últimos dos problemas complejos.',
        aiMessage: 'Estimada Martha Orozco: Saludo especial. Tomás aprobó su actividad con 3.2/5.0 demostrando constancia y puntualidad. Estaremos acompañándolo en tutoría para afianzar los problemas de aplicación.',
        notifiedAt: '2026-09-11 14:30',
        isNotified: true,
        isRead: false,
        readAt: null
      }
    }
  },
  {
    id: 'task-2',
    title: 'Informe Experimental: Fotosíntesis y Respiración',
    subjectId: 'cie',
    subjectName: 'Ciencias Naturales y Biología',
    gradeId: '9A',
    gradeName: '9°A',
    teacherId: 't-diana',
    teacherName: 'Prof. Diana Rojas',
    assignedDate: '2026-09-05',
    dueDate: '2026-09-12',
    description: 'Documentar el experimento de absorción lumínica en hojas de espinaca con registro fotográfico y conclusiones científicas.',
    status: 'Calificada y Notificada',
    studentGrades: {
      'std-nataly': {
        score: 4.7,
        teacherNote: 'Metodología científica impecable y excelente análisis de variables.',
        aiMessage: 'Estimada Sandra Patricia: Le compartimos que Nataly obtuvo una calificación notable de 4.7/5.0 en el informe experimental de Biología. Su capacidad de observación y rigor metodológico fueron sumamente elogiados.',
        notifiedAt: '2026-09-10 16:00',
        isNotified: true,
        isRead: true,
        readAt: '2026-09-10 18:30'
      },
      'std-mateo': {
        score: 3.4,
        teacherNote: 'Buen trabajo en equipo, faltó mayor profundidad en las conclusiones.',
        aiMessage: 'Estimado Jorge Valencia: Le informamos que Mateo alcanzó una nota aprobatoria de 3.4/5.0 en Ciencias Naturales. Colaboró activamente en el laboratorio y lo animamos a profundizar en el análisis escrito.',
        notifiedAt: '2026-09-10 16:00',
        isNotified: true,
        isRead: true,
        readAt: '2026-09-10 19:15'
      }
    }
  },
  {
    id: 'task-3',
    title: 'Evaluación Diagnóstica: Funciones Lineales y Pendiente',
    subjectId: 'mat',
    subjectName: 'Matemáticas y Álgebra',
    gradeId: '9A',
    gradeName: '9°A',
    teacherId: 't-carlos',
    teacherName: 'Prof. Carlos Mendoza',
    assignedDate: '2026-09-10',
    dueDate: '2026-09-16',
    description: 'Prueba corta de 5 preguntas sobre interpretación gráfica de la pendiente m e intercepto b.',
    status: 'Pendiente de Calificar',
    studentGrades: {
      'std-nataly': {
        score: 4.6,
        teacherNote: 'Muy buen razonamiento espacial en las gráficas.',
        aiMessage: '',
        notifiedAt: null,
        isNotified: false,
        isRead: false,
        readAt: null
      },
      'std-mateo': {
        score: 2.7,
        teacherNote: 'Confundió pendiente positiva con negativa.',
        aiMessage: '',
        notifiedAt: null,
        isNotified: false,
        isRead: false,
        readAt: null
      }
    }
  },
  {
    id: 'task-tec-1',
    title: 'Diagramas de Flujo y Lógica de Programación',
    subjectId: 'tec',
    subjectName: 'Tecnología e Informática',
    gradeId: '9A',
    gradeName: '9°A',
    teacherId: 't-roberto',
    teacherName: 'Prof. Roberto Silva',
    assignedDate: '2026-09-07',
    dueDate: '2026-09-14',
    description: 'Diseñar el algoritmo de control para un semáforo inteligente usando condicionales si/entonces.',
    status: 'Calificada y Notificada',
    studentGrades: {
      'std-nataly': {
        score: 4.9,
        teacherNote: 'Excelente lógica estructurada y creatividad en la solución.',
        aiMessage: 'Estimada Sandra Patricia: Le informamos con alegría que Nataly obtuvo una calificación sobresaliente de 4.9/5.0 en Tecnología. Demostró una capacidad analítica excepcional para resolver problemas lógicos.',
        notifiedAt: '2026-09-11 11:00',
        isNotified: true,
        isRead: true,
        readAt: '2026-09-11 12:30'
      },
      'std-mateo': {
        score: 3.2,
        teacherNote: 'El diagrama funciona pero faltó documentar las variables.',
        aiMessage: '',
        notifiedAt: null,
        isNotified: false,
        isRead: false,
        readAt: null
      }
    }
  },
  {
    id: 'task-tec-2',
    title: 'Proyecto Web: Maquetación HTML y Estilos CSS',
    subjectId: 'tec',
    subjectName: 'Tecnología e Informática',
    gradeId: '9A',
    gradeName: '9°A',
    teacherId: 't-roberto',
    teacherName: 'Prof. Roberto Silva',
    assignedDate: '2026-09-10',
    dueDate: '2026-09-18',
    description: 'Crear una página informativa sobre energías renovables con estructura semántica.',
    status: 'Pendiente de Calificar',
    studentGrades: {
      'std-nataly': {
        score: null,
        teacherNote: '',
        aiMessage: '',
        notifiedAt: null,
        isNotified: false,
        isRead: false,
        readAt: null
      }
    }
  },
  {
    id: 'task-tec-10b',
    title: 'Estructuras de Control y Arreglos en Python',
    subjectId: 'tec',
    subjectName: 'Programación y Algoritmos',
    gradeId: '10B',
    gradeName: '10°B',
    teacherId: 't-roberto',
    teacherName: 'Prof. Roberto Silva',
    assignedDate: '2026-09-08',
    dueDate: '2026-09-15',
    description: 'Implementar búsqueda binaria y ordenamiento sobre listas numéricas.',
    status: 'Pendiente de Calificar',
    studentGrades: {}
  },
  {
    id: 'task-tec-9b',
    title: 'Reto de Sensores Ultrasónicos con Arduino',
    subjectId: 'tec',
    subjectName: 'Robótica y Pensamiento Computacional',
    gradeId: '9B',
    gradeName: '9°B',
    teacherId: 't-roberto',
    teacherName: 'Prof. Roberto Silva',
    assignedDate: '2026-09-09',
    dueDate: '2026-09-16',
    description: 'Programar la evasión de obstáculos en el chasis móvil usando Tinkercad Circuits.',
    status: 'Pendiente de Calificar',
    studentGrades: {}
  },
  {
    id: 'task-tec-10a',
    title: 'Wireframes y Guía de Estilos en Figma',
    subjectId: 'tec',
    subjectName: 'Diseño Digital y Web',
    gradeId: '10A',
    gradeName: '10°A',
    teacherId: 't-roberto',
    teacherName: 'Prof. Roberto Silva',
    assignedDate: '2026-09-06',
    dueDate: '2026-09-13',
    description: 'Diseñar el flujo de navegación para una aplicación comunitaria móvil.',
    status: 'Calificada y Notificada',
    studentGrades: {}
  },
  {
    id: 'task-mat-9b',
    title: 'Taller: Teorema de Pitágoras y Razones Trigonométricas',
    subjectId: 'mat',
    subjectName: 'Matemáticas y Geometría',
    gradeId: '9B',
    gradeName: '9°B',
    teacherId: 't-carlos',
    teacherName: 'Prof. Carlos Mendoza',
    assignedDate: '2026-09-08',
    dueDate: '2026-09-15',
    description: 'Resolución de triángulos rectángulos y cálculo de alturas inaccesibles.',
    status: 'Pendiente de Calificar',
    studentGrades: {}
  },
  {
    id: 'task-mat-8a',
    title: 'Operaciones con Polinomios y Reducción de Términos',
    subjectId: 'mat',
    subjectName: 'Matemáticas y Álgebra',
    gradeId: '8A',
    gradeName: '8°A',
    teacherId: 't-carlos',
    teacherName: 'Prof. Carlos Mendoza',
    assignedDate: '2026-09-07',
    dueDate: '2026-09-14',
    description: 'Multiplicación de polinomios y productos notables aplicados a áreas geométricas.',
    status: 'Pendiente de Calificar',
    studentGrades: {}
  },
  {
    id: 'task-mat-11a',
    title: 'Taller de Límites Indeterminados y Continuidad',
    subjectId: 'mat',
    subjectName: 'Cálculo y Matemáticas',
    gradeId: '11A',
    gradeName: '11°A',
    teacherId: 't-carlos',
    teacherName: 'Prof. Carlos Mendoza',
    assignedDate: '2026-09-05',
    dueDate: '2026-09-12',
    description: 'Cálculo de límites trigonométricos e indeterminaciones del tipo 0/0.',
    status: 'Calificada y Notificada',
    studentGrades: {}
  }
];

