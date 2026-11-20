export interface MentorSlotDay {
  date: string;
  slots: { startTime: string; endTime: string }[];
}

export const MENTORSHIP_REQUEST_STATUSES = [
  'PENDIENTE',
  'ACEPTADO',
  'RECHAZADO',
  'CANCELADO',
] as const;

export type MentorshipRequestStatus = (typeof MENTORSHIP_REQUEST_STATUSES)[number];

export interface MentorshipRequest {
  id: string;
  mentorId: string;
  requesterId: string;
  requesterName: string | null;
  date: Date;
  startTime: Date;
  endTime: Date;
  message: string | null;
  status: MentorshipRequestStatus;
  createdAt: Date | null;
  respondedAt: Date | null;
  updatedAt: Date | null;
}

export interface MentorshipRequestPage {
  items: MentorshipRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Solicitud creada por el propio titulado, con los datos públicos del mentor. */
export interface MyMentorshipRequest extends MentorshipRequest {
  mentorName: string | null;
  mentorPosition: string | null;
  mentorCompany: string | null;
}

export type MentorshipRequestCounts = Record<'TODAS' | MentorshipRequestStatus, number>;

export interface MyMentorshipRequestPage extends MentorshipRequestPage {
  items: MyMentorshipRequest[];
  counts: MentorshipRequestCounts;
}
