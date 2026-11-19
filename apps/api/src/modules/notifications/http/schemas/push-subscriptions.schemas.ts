import { z } from 'zod';
import type { RegisterSubscriptionInput } from '../../application/contracts/push-subscription-inputs';

const base64Url = z
  .string()
  .min(1)
  .max(4096)
  .regex(/^[A-Za-z0-9_-]+={0,2}$/, 'Debe ser una cadena base64url válida');

export const pushSubscriptionSchema = z.strictObject({
  endpoint: z.string().url().max(4096),
  keys: z.strictObject({
    p256dh: base64Url,
    auth: base64Url,
  }),
  navegador: z.string().trim().max(120).optional(),
  plataforma: z.string().trim().max(120).optional(),
});

export type PushSubscriptionSchema = z.infer<typeof pushSubscriptionSchema>;

export function toRegisterSubscriptionInput(
  value: PushSubscriptionSchema,
): RegisterSubscriptionInput {
  return {
    endpoint: value.endpoint,
    p256dh: value.keys.p256dh,
    auth: value.keys.auth,
    navegador: value.navegador ?? null,
    plataforma: value.plataforma ?? null,
  };
}

export const unsubscribeSchema = z.strictObject({
  endpoint: z.string().url().max(4096),
});
