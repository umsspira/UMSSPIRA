import { EventPassRules } from '../../domain/event-pass.rules';
import { recordAttendanceSchema } from './events.schemas';

describe('recordAttendanceSchema', () => {
  const qrToken = EventPassRules.generateOpaqueToken();

  it('conserva el token emitido para buscar el pase en el servidor', () => {
    expect(recordAttendanceSchema.parse({ qrToken })).toEqual({ qrToken });
  });

  it.each([{}, { qrToken: null }, { qrToken: '' }, { qrToken: '   ' }, { qrToken: 'a'.repeat(256) }])(
    'rechaza una entrada sin token utilizable (%#)',
    (body) => {
      expect(recordAttendanceSchema.safeParse(body).success).toBe(false);
    },
  );

  it.each(['eventId', 'adminId', 'participantId'])('rechaza %s enviado por el cliente', (key) => {
    expect(recordAttendanceSchema.safeParse({ qrToken, [key]: 'otro-id' }).success).toBe(false);
  });
});
