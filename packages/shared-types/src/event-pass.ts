
export type EventPassStatus = 'ACTIVO' | 'INVALIDADO' | 'VENCIDO';

export interface ValidateEventPassInput {
  qrToken: string;
}

export interface ValidateEventPassResult {
  code: 'PASS_VALIDATED';
  attendanceRecorded: false;
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
