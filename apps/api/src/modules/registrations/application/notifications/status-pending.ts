import { escapeHtml } from './html-mail';

export const STATUS_PENDING_SUBJECT = '[UMSSPIRA] Tu solicitud de registro continúa en revisión';

export interface StatusPendingMailInput {
  fullName?: string | null;
  applicationId: string;
  origin?: string;
}

export interface StatusPendingMail {
  type: 'aprobacion';
  subject: string;
  text: string;
  html: string;
}

const COLOR = {
  page: '#FAF6EE',
  frame: '#EEE9DF',
  frameLine: '#D9D2C5',
  card: '#FFFFFF',
  cardLine: '#E0D9CB',
  header: '#0F172A',
  ink: '#1B2632',
  body: '#3D4551',
  muted: '#5B616B',
  panel: '#EEE9DF',
  line: '#C9C1B1',
  footer: '#F7F3EA',
};
const FONT = "Inter,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "Consolas,Menlo,Monaco,'Liberation Mono',monospace";

function resolveOrigin(origin?: string): string {
  const base = origin ?? process.env.WEB_BASE_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:3001';
  return base.replace(/\/+$/, '');
}

export function buildStatusPendingMail(input: StatusPendingMailInput): StatusPendingMail {
  const greeting = input.fullName?.trim() ? `Hola ${input.fullName.trim()},` : 'Hola,';

  const text = [
    greeting,
    '',
    'Te informamos que tu solicitud de registro en UMSSPIRA continúa en proceso de revisión por parte del comité de auditoría y validación documental.',
    '',
    `Número de solicitud: ${input.applicationId}`,
    '',
    'Estamos verificando tus antecedentes académicos y el respaldo documental entregado.',
    'En cuanto se emita un dictamen institucional, recibirás una notificación automática en esta misma dirección de correo con el resultado y los pasos a seguir.',
    '',
    'Aviso de seguridad institucional: Si no solicitaste este trámite, ignora este mensaje.',
    '',
    'Universidad Mayor de San Simón',
    'Sistema Oficial UMSSPIRA — Cochabamba, Bolivia',
    'Este es un mensaje institucional generado automáticamente. Por favor no responda directamente a este correo.',
  ].join('\n');

  return {
    type: 'aprobacion',
    subject: STATUS_PENDING_SUBJECT,
    text,
    html: renderStatusPendingHtml(input),
  };
}

export function renderStatusPendingHtml(input: StatusPendingMailInput): string {
  const origin = resolveOrigin(input.origin);
  const logo = `${origin}/assets/events/umsspira-logo-desktop.png`;
  const clockIcon = `${origin}/email/clock.png`;
  const shieldIcon = `${origin}/email/shield.png`;
  const name = input.fullName?.trim() ? escapeHtml(input.fullName.trim()) : '';
  const id = escapeHtml(input.applicationId);

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(STATUS_PENDING_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:${COLOR.page};font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.page};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${COLOR.frame};border:1px solid ${COLOR.frameLine};border-radius:16px;"><tr><td style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.card};border:1px solid ${COLOR.cardLine};border-radius:12px;overflow:hidden;">
<tr><td style="background:${COLOR.header};padding:18px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="left" style="vertical-align:middle;"><img src="${logo}" alt="UMSSPIRA" height="32" style="display:block;height:32px;width:auto;border:0;color:#FFFFFF;font-family:${FONT};font-size:16px;font-weight:700;"></td>
<td align="right" style="vertical-align:middle;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${COLOR.line};">Universidad Mayor de San Simón</td>
</tr></table></td></tr>
<tr><td align="center" style="padding:32px 32px 8px 32px;">
<img src="${clockIcon}" alt="" width="44" height="44" style="display:block;width:44px;height:44px;border:0;margin:0 auto 16px auto;">
<h1 style="margin:0 0 12px 0;font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;color:${COLOR.ink};">Tu solicitud continúa en revisión</h1>
<p style="margin:0;font-family:${FONT};font-size:15px;line-height:23px;color:${COLOR.body};">${name ? `Hola ${name}. ` : ''}Te informamos que tu solicitud de registro en UMSSPIRA continúa en proceso de revisión por parte del comité de auditoría y validación documental.</p>
</td></tr>
<tr><td style="padding:16px 32px 8px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.panel};border:1px solid ${COLOR.line};border-radius:12px;"><tr><td style="padding:18px 20px;">
<div style="font-family:${FONT};font-size:11px;line-height:15px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${COLOR.muted};">Estado del trámite</div>
<div style="font-family:${FONT};font-size:15px;line-height:22px;font-weight:700;color:${COLOR.ink};padding:4px 0 8px 0;">En revisión institucional</div>
<div style="font-family:${FONT};font-size:12px;line-height:18px;color:${COLOR.muted};">Número de solicitud: <span style="font-family:${MONO};color:${COLOR.ink};font-weight:600;">${id}</span></div>
</td></tr></table>
</td></tr>
<tr><td style="padding:12px 32px 8px 32px;">
<p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${COLOR.body};">Estamos validando tus antecedentes académicos y el respaldo documental entregado. En cuanto se emita un dictamen institucional, recibirás una notificación en esta dirección de correo.</p>
</td></tr>
<tr><td style="padding:12px 32px 8px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.footer};border:1px solid ${COLOR.cardLine};border-radius:10px;"><tr>
<td width="40" valign="top" style="padding:14px 0 14px 14px;"><img src="${shieldIcon}" alt="" width="16" height="16" style="display:block;width:16px;height:16px;border:0;"></td>
<td style="padding:14px 14px 14px 6px;font-family:${FONT};font-size:13px;line-height:19px;font-weight:600;color:${COLOR.ink};">Aviso de seguridad institucional: Si no solicitaste este trámite, ignora este mensaje.</td>
</tr></table></td></tr>
<tr><td align="center" style="background:${COLOR.footer};border-top:1px solid ${COLOR.cardLine};padding:20px 24px;font-family:${FONT};">
<div style="font-size:12px;line-height:18px;font-weight:700;color:${COLOR.ink};">Universidad Mayor de San Simón</div>
<div style="font-size:12px;line-height:18px;color:${COLOR.body};">Sistema Oficial UMSSPIRA — Cochabamba, Bolivia</div>
<div style="font-size:11px;line-height:16px;color:${COLOR.muted};padding-top:8px;">Este es un mensaje institucional generado automáticamente. Por favor no responda directamente a este correo.</div>
</td></tr>
</table></td></tr></table></td></tr></table></body></html>`;
}
