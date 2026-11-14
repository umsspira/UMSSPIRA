import { escapeHtml } from './html-mail';

export const ACCOUNT_ALREADY_ACTIVE_SUBJECT = '[UMSSPIRA] Tu cuenta ya está activa';

export interface AccountAlreadyActiveMailInput {
  fullName?: string | null;
  origin?: string;
}

export interface AccountAlreadyActiveMail {
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
  accent: '#FFB162',
  ink: '#1B2632',
  body: '#3D4551',
  muted: '#5B616B',
  panel: '#EEE9DF',
  line: '#C9C1B1',
  footer: '#F7F3EA',
};
const FONT = "Inter,'Segoe UI',Helvetica,Arial,sans-serif";

function resolveOrigin(origin?: string): string {
  const base = origin ?? process.env.WEB_BASE_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:3001';
  return base.replace(/\/+$/, '');
}

export function buildAccountAlreadyActiveMail(
  input: AccountAlreadyActiveMailInput,
): AccountAlreadyActiveMail {
  const origin = resolveOrigin(input.origin);
  const loginUrl = `${origin}/login`;
  const recoveryUrl = `${origin}/forgot-password`;
  const greeting = input.fullName?.trim() ? `Hola ${input.fullName.trim()},` : 'Hola,';

  const text = [
    greeting,
    '',
    'Te informamos que tu cuenta en UMSSPIRA ya se encuentra activa y habilitada para acceder a la plataforma institucional.',
    '',
    'Puedes iniciar sesión directamente con tu correo electrónico y tu contraseña habitual.',
    'Si no recuerdas tu contraseña, puedes restablecerla desde la pantalla de recuperación.',
    '',
    `Iniciar sesión: ${loginUrl}`,
    `Recuperar contraseña: ${recoveryUrl}`,
    '',
    'Por tu seguridad, este mensaje no contiene códigos de activación ni enlaces de emisión.',
    '',
    'Aviso de seguridad institucional: Si no reconoces esta cuenta o no realizaste esta consulta, puedes ignorar este mensaje.',
    '',
    'Universidad Mayor de San Simón',
    'Sistema Oficial UMSSPIRA — Cochabamba, Bolivia',
    'Este es un mensaje institucional generado automáticamente. Por favor no responda directamente a este correo.',
  ].join('\n');

  return {
    type: 'aprobacion',
    subject: ACCOUNT_ALREADY_ACTIVE_SUBJECT,
    text,
    html: renderAccountAlreadyActiveHtml(input),
  };
}

export function renderAccountAlreadyActiveHtml(input: AccountAlreadyActiveMailInput): string {
  const origin = resolveOrigin(input.origin);
  const logo = `${origin}/assets/events/umsspira-logo-desktop.png`;
  const checkIcon = `${origin}/email/check-badge.png`;
  const shieldIcon = `${origin}/email/shield.png`;
  const loginUrl = escapeHtml(`${origin}/login`);
  const recoveryUrl = escapeHtml(`${origin}/forgot-password`);
  const name = input.fullName?.trim() ? escapeHtml(input.fullName.trim()) : '';

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(ACCOUNT_ALREADY_ACTIVE_SUBJECT)}</title></head>
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
<img src="${checkIcon}" alt="" width="44" height="44" style="display:block;width:44px;height:44px;border:0;margin:0 auto 16px auto;">
<h1 style="margin:0 0 12px 0;font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;color:${COLOR.ink};">Tu cuenta ya está activa</h1>
<p style="margin:0;font-family:${FONT};font-size:15px;line-height:23px;color:${COLOR.body};">${name ? `Hola ${name}. ` : ''}Te informamos que tu cuenta en UMSSPIRA ya se encuentra activa y habilitada para acceder a la plataforma institucional.</p>
</td></tr>
<tr><td style="padding:16px 32px 8px 32px;">
<p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${COLOR.body};">Puedes iniciar sesión directamente o, si no recuerdas tu contraseña, solicitar su restablecimiento.</p>
</td></tr>
<tr><td align="center" style="padding:20px 32px 8px 32px;">
<a href="${loginUrl}" style="display:inline-block;background:${COLOR.accent};color:${COLOR.ink};font-family:${FONT};font-size:14px;line-height:20px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:8px;box-shadow:0 2px 4px rgba(27,38,50,0.18);margin-bottom:12px;">Iniciar sesión</a>
<br>
<a href="${recoveryUrl}" style="display:inline-block;color:${COLOR.ink};font-family:${FONT};font-size:13px;line-height:18px;font-weight:600;text-decoration:underline;">Recuperar contraseña</a>
</td></tr>
<tr><td align="center" style="padding:12px 32px 16px 32px;font-family:${FONT};font-size:12px;line-height:18px;color:${COLOR.muted};">
Si los enlaces no abren en tu navegador, cópialos directamente:<br>
Iniciar sesión: <a href="${loginUrl}" style="color:${COLOR.ink};word-break:break-all;">${loginUrl}</a><br>
Recuperar contraseña: <a href="${recoveryUrl}" style="color:${COLOR.ink};word-break:break-all;">${recoveryUrl}</a>
</td></tr>
<tr><td style="padding:12px 32px 8px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.footer};border:1px solid ${COLOR.cardLine};border-radius:10px;"><tr>
<td width="40" valign="top" style="padding:14px 0 14px 14px;"><img src="${shieldIcon}" alt="" width="16" height="16" style="display:block;width:16px;height:16px;border:0;"></td>
<td style="padding:14px 14px 14px 6px;font-family:${FONT};font-size:13px;line-height:19px;font-weight:600;color:${COLOR.ink};">Aviso de seguridad institucional: Por tu seguridad, este mensaje no contiene códigos de activación ni enlaces de emisión temporal.</td>
</tr></table></td></tr>
<tr><td align="center" style="background:${COLOR.footer};border-top:1px solid ${COLOR.cardLine};padding:20px 24px;font-family:${FONT};">
<div style="font-size:12px;line-height:18px;font-weight:700;color:${COLOR.ink};">Universidad Mayor de San Simón</div>
<div style="font-size:12px;line-height:18px;color:${COLOR.body};">Sistema Oficial UMSSPIRA — Cochabamba, Bolivia</div>
<div style="font-size:11px;line-height:16px;color:${COLOR.muted};padding-top:8px;">Este es un mensaje institucional generado automáticamente. Por favor no responda directamente a este correo.</div>
</td></tr>
</table></td></tr></table></td></tr></table></body></html>`;
}
