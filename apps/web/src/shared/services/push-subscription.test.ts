import {
  toSubscriptionInput,
  urlBase64ToUint8Array,
  getVapidPublicKey,
} from './push-subscription';

describe('servicio de suscripciones Push (HU13 - T8)', () => {
  it('convierte una clave VAPID base64url en bytes', () => {
    const bytes = urlBase64ToUint8Array('AQAB');
    expect(Array.from(bytes)).toEqual([1, 0, 1]);
  });

  it('normaliza los caracteres base64url (- y _)', () => {
    // "-_" equivale en base64 a "+/" -> bytes válidos
    expect(() => urlBase64ToUint8Array('-_')).not.toThrow();
  });

  it('extrae endpoint y claves de una suscripción del navegador', () => {
    const subscription = {
      endpoint: 'https://push.example.com/xyz',
      toJSON: () => ({
        endpoint: 'https://push.example.com/xyz',
        keys: { p256dh: 'clave-p256dh', auth: 'secreto-auth' },
      }),
    } as unknown as PushSubscription;

    const input = toSubscriptionInput(subscription);
    expect(input.endpoint).toBe('https://push.example.com/xyz');
    expect(input.keys.p256dh).toBe('clave-p256dh');
    expect(input.keys.auth).toBe('secreto-auth');
  });

  it('devuelve la clave VAPID pública recortada del entorno', () => {
    const original = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = '  ABCDEF  ';
    expect(getVapidPublicKey()).toBe('ABCDEF');
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = original;
  });
});
