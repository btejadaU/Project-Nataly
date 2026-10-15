import React from 'react';
import { Clock, CheckCircle2, XCircle, Award } from 'lucide-react';
import { APPEAL_STATUS } from '../../utils/appealsStorage';

export default function GradeAppealBadge({ status = APPEAL_STATUS.CALIFICADA, className = '' }) {
  switch (status) {
    case APPEAL_STATUS.EN_REVISION:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs ${className}`}
          title="La solicitud de revisión ha sido enviada al docente"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Solicitud de revisión</span>
        </span>
      );

    case APPEAL_STATUS.REVISION_ACEPTADA:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs ${className}`}
          title="El docente ha aceptado revisar la calificación en clase"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Revisión programada</span>
        </span>
      );

    case APPEAL_STATUS.REVISION_RECHAZADA:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs ${className}`}
          title="El docente ha mantenido la calificación tras revisar la solicitud"
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Revisión rechazada</span>
        </span>
      );

    case APPEAL_STATUS.CALIFICADA:
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
          title="Calificación normal sin apelación activa"
        >
          <Award className="w-3 h-3 text-slate-500 shrink-0" />
          <span>Calificada</span>
        </span>
      );
  }
}
