import { jobPostingAffinityBatchSchema } from './job-posting-affinity-batch.schema';

const UUID_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const UUID_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ids = (count: number) => Array.from({ length: count }, (_, index) =>
  `${(index + 1).toString(16).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
);

describe('T10.5 Zod request schema', () => {
  it('acepta lote de vacantes con 1 y 50 UUIDs', () => {
    expect(jobPostingAffinityBatchSchema.safeParse({ mode: 'vacancies', vacancyIds: [UUID_1] }).success).toBe(true);
    expect(jobPostingAffinityBatchSchema.safeParse({ mode: 'vacancies', vacancyIds: ids(50) }).success).toBe(true);
  });

  it('rechaza lote vacío, 51, UUID inválido y duplicados', () => {
    expect(jobPostingAffinityBatchSchema.safeParse({ mode: 'vacancies', vacancyIds: [] }).success).toBe(false);
    expect(jobPostingAffinityBatchSchema.safeParse({ mode: 'vacancies', vacancyIds: ids(51) }).success).toBe(false);
    expect(jobPostingAffinityBatchSchema.safeParse({ mode: 'vacancies', vacancyIds: ['not-a-uuid'] }).success).toBe(false);
    expect(jobPostingAffinityBatchSchema.safeParse({ mode: 'vacancies', vacancyIds: [UUID_1, UUID_1] }).success).toBe(false);
  });

  it('acepta applicants con vacante UUID y IDs únicos', () => {
    expect(jobPostingAffinityBatchSchema.safeParse({ mode: 'applicants', vacancyId: UUID_1, applicationIds: [UUID_2] }).success).toBe(true);
  });

  it('rechaza IDs duplicados, request inválido y campos extra de identidad', () => {
    expect(jobPostingAffinityBatchSchema.safeParse({ mode: 'applicants', vacancyId: UUID_1, applicationIds: [UUID_2, UUID_2] }).success).toBe(false);
    expect(jobPostingAffinityBatchSchema.safeParse({ mode: 'applicants', vacancyId: UUID_1, applicationIds: [UUID_2], userId: 'other-user' }).success).toBe(false);
    expect(jobPostingAffinityBatchSchema.safeParse({ mode: 'other', vacancyIds: [UUID_1] }).success).toBe(false);
  });
});
