import type { MentorSchedule, MentorWeeklySchedule } from '../../domain/entities/mentor';

export const MENTOR_SCHEDULE_REPOSITORY = Symbol('MENTOR_SCHEDULE_REPOSITORY');

export interface MentorScheduleRepository {
  own(userId: string): Promise<MentorWeeklySchedule>;
  replace(userId: string, schedule: MentorSchedule[]): Promise<MentorWeeklySchedule>;
}
