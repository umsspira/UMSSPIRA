
export type EventPassStatus = 'ACTIVO' | 'INVALIDADO' | 'VENCIDO';

export interface ValidateEventPassInput {
  qrToken: string;
}

export interface EventAttendanceResult {
  code: 'ATTENDANCE_RECORDED' | 'ATTENDANCE_ALREADY_RECORDED';
  attendanceRecorded: true;
  eventId: string;
  eventTitle: string;
  registrationId: string;
  participantName: string;
  attendedAt: string;
}

export interface EventPassQrPayload {
  v: 1;
  token: string;
}

export interface EventPassEventDetails {
  name: string;
  userName: string;
  dateTime: string;
  location: string;
}

export interface EventPassDto {
  id: string;
  registrationId: string;
  eventId: string;
  userId: string;
  qrToken: string;
  status: EventPassStatus;
  isValidForAccess: boolean;
  issuedAt: string;
  expiresAt: string | null;
  eventDetails?: EventPassEventDetails;
}
