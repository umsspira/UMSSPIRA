import { isAffinityProfileComplete } from './is-affinity-profile-complete';

const complete = {
  description: 'Desarrollo de software',
  hasEducation: true,
  hasExperience: true,
  hasCertification: true,
  hasProject: true,
};

describe('HU10: completitud compatible con postulación', () => {
  it('requiere las cinco fuentes, sin depender de habilidades ni mentorías', () => {
    expect(isAffinityProfileComplete(complete)).toBe(true);
  });

  it.each(['hasEducation', 'hasExperience', 'hasCertification', 'hasProject'] as const)(
    'no está completo si falta %s',
    (field) => {
      expect(isAffinityProfileComplete({ ...complete, [field]: false })).toBe(false);
    },
  );

  it.each([null, '', ' \n '])('exige descripción no vacía: %j', (description) => {
    expect(isAffinityProfileComplete({ ...complete, description })).toBe(false);
  });
});
