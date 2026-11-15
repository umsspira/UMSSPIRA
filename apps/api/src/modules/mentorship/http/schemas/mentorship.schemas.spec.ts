import { mentorInformationSchema } from './mentorship.schemas';

describe('mentorInformationSchema', () => {
  it('accepts textual profile information without a photo', () => {
    expect(mentorInformationSchema.safeParse({
      descripcion: 'Orientación profesional',
      experiencia: 'Cinco años de experiencia',
      informacion_relevante: 'Sesiones virtuales',
    }).success).toBe(true);
  });

  it('rejects legacy photo fields in profile updates', () => {
    expect(mentorInformationSchema.safeParse({
      descripcion: 'Orientación profesional',
      experiencia: 'Cinco años de experiencia',
      foto_perfil: 'https://storage.example.com/mentor.jpg',
    }).success).toBe(false);
  });
});
