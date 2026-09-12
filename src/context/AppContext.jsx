import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  initialGrades,
  initialSubjects,
  initialTeachers,
  initialStudents,
  initialSchedule9A,
  initialTasks
} from '../data/mockData';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Roles: 'admin', 'teacher', 'guardian'
  const [currentRole, setCurrentRole] = useState('teacher');

  // Master lists
  const [grades, setGrades] = useState(initialGrades);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [teachers, setTeachers] = useState(initialTeachers);
  const [students, setStudents] = useState(initialStudents);
  const [schedule, setSchedule] = useState(initialSchedule9A);
  const [tasks, setTasks] = useState(initialTasks);

  // Active identities
  const [activeTeacherId, setActiveTeacherId] = useState('t-carlos');
  const [activeStudentId, setActiveStudentId] = useState('std-nataly');

  // In-app notifications history / toast feed
  const [inAppAlerts, setInAppAlerts] = useState([
    {
      id: 'alert-1',
      title: 'Reporte académico disponible',
      message: 'El Prof. Carlos Mendoza ha notificado la nota de Nataly en Álgebra (4.8).',
      taskId: 'task-1',
      studentId: 'std-nataly',
      timestamp: 'Hoy, 2:30 PM',
      read: true
    }
  ]);

  // Current active teacher and student objects
  const activeTeacher = useMemo(() => {
    return teachers.find(t => t.id === activeTeacherId) || teachers[0];
  }, [teachers, activeTeacherId]);

  const activeStudent = useMemo(() => {
    return students.find(s => s.id === activeStudentId) || students[0];
  }, [students, activeStudentId]);

  // Number of unread grades/notifications for active student
  const unreadAlertsForActiveStudent = useMemo(() => {
    let count = 0;
    tasks.forEach(task => {
      const studentGrade = task.studentGrades?.[activeStudentId];
      if (studentGrade && studentGrade.isNotified && !studentGrade.isRead) {
        count++;
      }
    });
    return count;
  }, [tasks, activeStudentId]);

  // Actions
  const createTask = (newTaskData) => {
    const subject = subjects.find(s => s.id === newTaskData.subjectId) || subjects[0];
    const teacher = teachers.find(t => t.id === activeTeacherId) || teachers[0];

    const newTask = {
      id: `task-${Date.now()}`,
      title: newTaskData.title,
      subjectId: subject.id,
      subjectName: subject.name,
      gradeId: newTaskData.gradeId || '9A',
      gradeName: '9°A',
      teacherId: teacher.id,
      teacherName: teacher.name,
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: newTaskData.dueDate,
      description: newTaskData.description || 'Sin descripción adicional.',
      status: 'Pendiente de Calificar',
      studentGrades: {}
    };

    setTasks(prev => [newTask, ...prev]);
    return newTask;
  };

  const updateStudentGrade = (taskId, studentId, gradePayload) => {
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id !== taskId) return task;

        const currentGrades = task.studentGrades || {};
        const existingStudentGrade = currentGrades[studentId] || {
          score: null,
          teacherNote: '',
          aiMessage: '',
          isNotified: false,
          notifiedAt: null,
          isRead: false,
          readAt: null
        };

        return {
          ...task,
          studentGrades: {
            ...currentGrades,
            [studentId]: {
              ...existingStudentGrade,
              ...gradePayload
            }
          }
        };
      });
    });
  };

  const notifyGuardian = (taskId, studentId) => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    let targetTask = null;
    const targetStudent = students.find(s => s.id === studentId);

    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id !== taskId) return task;
        targetTask = task;
        const currentGrades = task.studentGrades || {};
        const studentGrade = currentGrades[studentId];

        return {
          ...task,
          status: 'Calificada y Notificada',
          studentGrades: {
            ...currentGrades,
            [studentId]: {
              ...studentGrade,
              isNotified: true,
              notifiedAt: formattedDate,
              isRead: false
            }
          }
        };
      });
    });

    if (targetStudent && targetTask) {
      const score = targetTask.studentGrades?.[studentId]?.score;
      const newAlert = {
        id: `alert-${Date.now()}`,
        title: `Calificación notificada para ${targetStudent.name.split(' ')[0]}`,
        message: `${targetTask.subjectName}: Calificación de ${score !== undefined && score !== null ? score : 'N/A'} en "${targetTask.title}". Mensaje adaptado disponible en la app.`,
        taskId: targetTask.id,
        studentId: targetStudent.id,
        timestamp: 'Justo ahora',
        read: false
      };
      setInAppAlerts(prev => [newAlert, ...prev]);
    }
  };

  const confirmReadNotification = (taskId, studentId) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('es-CO')} a las ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id !== taskId) return task;
        const currentGrades = task.studentGrades || {};
        const studentGrade = currentGrades[studentId];
        if (!studentGrade) return task;

        return {
          ...task,
          studentGrades: {
            ...currentGrades,
            [studentId]: {
              ...studentGrade,
              isRead: true,
              readAt: formattedDate
            }
          }
        };
      });
    });

    // Mark corresponding alerts as read
    setInAppAlerts(prev => prev.map(a => {
      if (a.taskId === taskId && a.studentId === studentId) {
        return { ...a, read: true };
      }
      return a;
    }));
  };

  const addStudent = (studentData) => {
    const newStudent = {
      id: `std-${Date.now()}`,
      name: studentData.name,
      gradeId: studentData.gradeId || '9A',
      gradeName: '9°A',
      avatar: studentData.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(studentData.name)}`,
      guardianName: studentData.guardianName,
      guardianKinship: studentData.guardianKinship || 'Acudiente',
      guardianPhone: studentData.guardianPhone,
      guardianEmail: studentData.guardianEmail || '',
      status: 'Activo'
    };
    setStudents(prev => [...prev, newStudent]);
    return newStudent;
  };

  const addTeacher = (teacherData) => {
    const newTeacher = {
      id: `t-${Date.now()}`,
      name: teacherData.name,
      email: teacherData.email,
      phone: teacherData.phone,
      subject: teacherData.subject,
      grades: teacherData.grades || ['9°A'],
      avatar: teacherData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(teacherData.name)}`
    };
    setTeachers(prev => [...prev, newTeacher]);
    return newTeacher;
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        grades,
        subjects,
        teachers,
        students,
        schedule,
        tasks,
        activeTeacherId,
        setActiveTeacherId,
        activeStudentId,
        setActiveStudentId,
        activeTeacher,
        activeStudent,
        inAppAlerts,
        unreadAlertsForActiveStudent,
        createTask,
        updateStudentGrade,
        notifyGuardian,
        confirmReadNotification,
        addStudent,
        addTeacher
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
