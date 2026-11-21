import type {
  MentorSlotDay,
  MentorshipRequest,
  MyMentorshipRequest,
} from '../../domain/entities/mentorship-request';

export function presentMentorSlots(days: MentorSlotDay[]) {
  return days.map((day) => ({
    fecha: day.date,
    horarios: day.slots.map((slot) => ({
      hora_inicio: slot.startTime,
      hora_fin: slot.endTime,
    })),
  }));
}

const date = (value: Date) => value.toISOString().slice(0, 10);
const time = (value: Date) => value.toISOString().slice(11, 16);

export function presentMentorshipRequest(request: MentorshipRequest) {
  return {
    id: request.id,
    id_mentor: request.mentorId,
    solicitante: { id: request.requesterId, nombre: request.requesterName },
    fecha: date(request.date),
    hora_inicio: time(request.startTime),
    hora_fin: time(request.endTime),
    mensaje: request.message,
    estado: request.status,
    fecha_creacion: request.createdAt ? date(request.createdAt) : null,
    fecha_respuesta: request.respondedAt ? date(request.respondedAt) : null,
    fecha_actualizacion: request.updatedAt ? date(request.updatedAt) : null,
  };
}

/** Solicitud del historial del titulado: solo datos públicos del mentor. */
export function presentMyMentorshipRequest(request: MyMentorshipRequest) {
  return {
    id: request.id,
    mentor: {
      id: request.mentorId,
      nombre: request.mentorName,
      cargo: request.mentorPosition,
      empresa: request.mentorCompany,
    },
    fecha: date(request.date),
    hora_inicio: time(request.startTime),
    hora_fin: time(request.endTime),
    mensaje: request.message,
    estado: request.status,
    fecha_creacion: request.createdAt ? date(request.createdAt) : null,
    fecha_respuesta: request.respondedAt ? date(request.respondedAt) : null,
    fecha_actualizacion: request.updatedAt ? date(request.updatedAt) : null,
  };
}
