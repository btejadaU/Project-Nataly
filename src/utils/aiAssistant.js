// Utilidad para la adaptación de mensajes con IA amigable y respetuosa

export function generateAIEmpatheticMessage({
  studentName = 'el estudiante',
  guardianName = 'Acudiente',
  guardianKinship = 'Acudiente',
  subjectName = 'la asignatura',
  taskTitle = 'la actividad académica',
  score = null,
  teacherRawNote = '',
  tone = 'empathetic' // 'empathetic', 'formal', 'reinforcement'
}) {
  const numScore = parseFloat(score);
  const firstName = studentName.split(' ')[0];
  const guardianSalutation = guardianKinship && guardianKinship.toLowerCase().includes('madre')
    ? `Estimada ${guardianName}`
    : guardianKinship && guardianKinship.toLowerCase().includes('padre')
    ? `Estimado ${guardianName}`
    : `Apreciado(a) ${guardianName}`;

  const cleanNote = teacherRawNote.trim();
  const noteContext = cleanNote ? ` Observación del docente: "${cleanNote}".` : '';

  if (isNaN(numScore) || numScore === null) {
    return `${guardianSalutation}: Le informamos cordialmente que el docente de ${subjectName} ha registrado una novedad sobre la actividad "${taskTitle}" para ${firstName}.${noteContext} Quedamos a su disposición para cualquier inquietud.`;
  }

  // Caso: Calificación Sobresaliente / Alta (>= 4.0)
  if (numScore >= 4.0) {
    if (tone === 'formal') {
      return `${guardianSalutation}: Por medio de la presente, el área de ${subjectName} le comunica el resultado obtenido por ${firstName} en la actividad "${taskTitle}", alcanzando una calificación destacada de ${numScore.toFixed(1)}/5.0.${noteContext} Agradecemos el constante acompañamiento desde el hogar en su proceso formativo.`;
    }
    return `${guardianSalutation}: ¡Reciba un cordial saludo! Nos llena de orgullo compartirle que ${firstName} obtuvo una calificación excelente de ${numScore.toFixed(1)}/5.0 en "${taskTitle}" (${subjectName}).${noteContext} Su esfuerzo y dedicación se reflejan claramente en sus logros. ¡Sigamos impulsando juntos su talento!`;
  }

  // Caso: Calificación Aprobatoria Regular (3.0 a 3.9)
  if (numScore >= 3.0 && numScore < 4.0) {
    if (tone === 'formal') {
      return `${guardianSalutation}: Le notificamos que ${firstName} ha obtenido una calificación aprobatoria de ${numScore.toFixed(1)}/5.0 en la entrega de "${taskTitle}" para el área de ${subjectName}.${noteContext} Sugerimos mantener el seguimiento en casa para fortalecer los temas vistos.`;
    }
    return `${guardianSalutation}: Esperamos se encuentre muy bien. Le informamos que ${firstName} aprobó satisfactoriamente su actividad "${taskTitle}" en ${subjectName} con una nota de ${numScore.toFixed(1)}/5.0.${noteContext} Con un poco más de práctica y constancia, estamos seguros de que alcanzará niveles aún más altos. ¡Cuenta con nuestro apoyo!`;
  }

  // Caso: Calificación en Alerta / Reprobada (< 3.0)
  if (tone === 'formal') {
    return `${guardianSalutation}: Le informamos con interés institucional que en la actividad "${taskTitle}" (${subjectName}), ${firstName} obtuvo una calificación de ${numScore.toFixed(1)}/5.0, encontrándose por debajo del promedio aprobatorio.${noteContext} Le invitamos a consultar el plan de nivelación disponible en el aula.`;
  }
  
  return `${guardianSalutation}: Le extendemos un saludo fraterno y respetuoso. Queremos comunicarle oportunamente que ${firstName} obtuvo una calificación de ${numScore.toFixed(1)}/5.0 en la actividad "${taskTitle}" de ${subjectName}.${noteContext} Vemos esta situación como una valiosa oportunidad de aprendizaje y refuerzo. Le sugerimos revisar los conceptos en casa y coordinar con el docente para el plan de mejoramiento pedagógico. Juntos apoyaremos a ${firstName} a superar este reto.`;
}
