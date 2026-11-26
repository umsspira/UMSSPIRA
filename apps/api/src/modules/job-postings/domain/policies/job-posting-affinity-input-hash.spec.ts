import { JOB_AFFINITY_INPUT_VERSION, jobPostingAffinityInputHash } from './job-posting-affinity-input-hash';
import type { JobPostingAffinityProfile } from '../../application/ports/job-posting-affinity-data.port';

const profile: JobPostingAffinityProfile = {
  userId: 'user', tituladoId: 'graduate', description: 'Java',
  hasEducation: true, hasExperience: true, hasCertification: true, hasProject: true,
  texts: ['Java', 'SQL', 'React'],
};
const vacancy = { vacancyId: 'vacancy', requirements: ['Java', 'SQL'] };

describe('hash de entrada de afinidad laboral HU-12', () => {
  it('es estable ante orden, espacios, mayúsculas y requisitos duplicados', () => {
    expect(jobPostingAffinityInputHash(profile, vacancy)).toBe(jobPostingAffinityInputHash(
      { ...profile, texts: [' react ', 'sql', ' JAVA '] },
      { ...vacancy, requirements: [' sql ', 'JAVA', 'Java'] },
    ));
  });

  it('cambia cuando cambia un texto, la completitud, un requisito o la versión efectiva', () => {
    const original = jobPostingAffinityInputHash(profile, vacancy);
    expect(jobPostingAffinityInputHash({ ...profile, texts: ['Java', 'SQL', 'Docker'] }, vacancy)).not.toBe(original);
    expect(jobPostingAffinityInputHash({ ...profile, hasProject: false }, vacancy)).not.toBe(original);
    expect(jobPostingAffinityInputHash(profile, { ...vacancy, requirements: ['Java', 'Docker'] })).not.toBe(original);
    expect(jobPostingAffinityInputHash(profile, vacancy, `${JOB_AFFINITY_INPUT_VERSION}-next`)).not.toBe(original);
    expect(original).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ignora identidad y campos ajenos al motor', () => {
    expect(jobPostingAffinityInputHash(profile, vacancy)).toBe(jobPostingAffinityInputHash(
      { ...profile, userId: 'other-user', tituladoId: 'other-graduate' },
      { ...vacancy, vacancyId: 'other-vacancy' },
    ));
  });
});
