import type { MentorshipRequestStatus } from '../../domain/entities/mentorship-request';

export interface MyMentorshipRequestQuery {
  /** Sin estado se devuelven todos los estados del historial propio. */
  status?: MentorshipRequestStatus;
  page: number;
  pageSize: number;
}
