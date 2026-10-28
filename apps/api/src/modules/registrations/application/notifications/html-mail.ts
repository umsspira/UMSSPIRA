// Colores del sistema de diseño (tailwind.config.ts). Se escriben como valores sólidos
// porque los clientes de correo no soportan variables CSS ni transparencias.
const COLOR = {
  page: '#F5F0E8',
  card: '#FFFFFF',
  header: '#1B2632',
  accent: '#FFB162',
  ink: '#1B2632',
  muted: '#585C60',
  panel: '#EEE9DF',
  line: '#C9C1B1',
  footer: '#F1EDE5',
};
const FONT = "'Inter', 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";
const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ApprovalHtmlInput {
  name: string;
  code: string;
  activationLink: string;
  applicationId: string;
  logoUrl: string;
}

// Cuerpo HTML del correo de aprobación. Usa tablas y estilos en línea porque los clientes
// de correo no soportan CSS moderno. Todo valor variable se escapa antes de entrar al HTML.
export function renderApprovalHtml(input: ApprovalHtmlInput): string {
  const c = COLOR;
  const name = escapeHtml(input.name.trim());
  const code = escapeHtml(input.code);
  const link = escapeHtml(input.activationLink);
  const id = escapeHtml(input.applicationId);
  const logo = escapeHtml(input.logoUrl);
  const hello = name ? 'Hola ' + name + ',' : 'Hola,';
  const kicker = 'font-size:11px;line-height:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;';
  const heading = `margin:0 0 10px 0;font-family:${FONT};font-size:16px;line-height:22px;font-weight:600;color:${c.ink};`;
  const small = `margin:0 0 10px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${c.muted};`;
  const step = (n: number, text: string) => `<tr>
<td width="36" valign="top" style="padding:0 12px 10px 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" width="24" height="24" bgcolor="${c.accent}" style="width:24px;height:24px;border-radius:12px;font-family:${FONT};font-size:12px;line-height:24px;font-weight:700;color:${c.ink};">${n}</td></tr></table></td>
<td valign="top" style="padding:1px 0 10px 0;font-family:${FONT};font-size:14px;line-height:22px;color:${c.muted};">${text}</td>
</tr>`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="${FONT_LINK}" rel="stylesheet">
<title>Solicitud aprobada</title>
</head>
<body style="margin:0;padding:0;background:${c.page};font-family:${FONT};color:${c.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${c.card};border-radius:14px;overflow:hidden;">
<tr><td style="background:${c.header};padding:18px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="left">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:10px;"><img src="${logo}" alt="" height="32" style="display:block;border:0;height:32px;"></td>
<td style="font-family:${FONT};font-size:20px;line-height:24px;font-weight:700;color:#FFFFFF;">UMSS<span style="color:${c.accent};">PIRA</span></td>
</tr></table>
</td>
<td align="right" style="font-family:${FONT};${kicker}color:#E5E0D6;">Universidad Mayor de San Simón</td>
</tr></table>
</td></tr>
<tr><td align="center" style="padding:32px 28px 8px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td align="center" width="56" height="56" style="width:56px;height:56px;border-radius:28px;background:${c.accent};color:${c.ink};font-size:28px;font-weight:700;line-height:56px;">&#10003;</td>
</tr></table>
<h1 style="margin:20px 0 12px 0;font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;color:${c.ink};">¡Tu solicitud fue aprobada!</h1>
<p style="margin:0 0 6px 0;font-family:${FONT};font-size:14px;line-height:22px;font-weight:600;color:${c.ink};">${hello}</p>
<p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${c.muted};">Nos complace informarte que se han revisado y validado satisfactoriamente tus antecedentes académicos y documentación de respaldo para la emisión y acreditación institucional.</p>
</td></tr>
<tr><td style="padding:20px 28px 8px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.panel};border:1px solid ${c.line};border-radius:12px;"><tr>
<td align="center" style="padding:20px;">
<div style="font-family:${FONT};${kicker}color:${c.muted};">Código de activación temporal (OTP)</div>
<div style="margin:12px 0;padding:14px 8px 14px 22px;background:#FFFFFF;border:1px solid ${c.line};border-radius:8px;font-family:${MONO};font-size:34px;line-height:40px;font-weight:700;letter-spacing:14px;color:${c.ink};">${code}</div>
<div style="font-family:${FONT};font-size:12px;line-height:18px;color:${c.muted};">Este código tiene una vigencia de 24 horas a partir de la recepción de este mensaje.</div>
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:16px 28px 8px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td bgcolor="${c.accent}" style="border-radius:8px;"><a href="${link}" style="display:inline-block;padding:14px 44px;font-family:${FONT};font-size:14px;line-height:20px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:${c.ink};text-decoration:none;">Activar mi cuenta</a></td>
</tr></table>
<p style="margin:16px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${c.muted};">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${link}" style="color:${c.muted};word-break:break-all;">${link}</a></p>
</td></tr>
<tr><td style="padding:20px 28px 4px 28px;">
<p style="${heading}">Cómo activar tu cuenta</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${step(1, 'Pulsa «Activar mi cuenta» o abre el enlace de este mensaje.')}
${step(2, 'Escribe el código de activación de 6 dígitos que aparece arriba.')}
${step(3, 'Crea tu contraseña institucional y accede a tu cuenta.')}
</table>
</td></tr>
<tr><td style="padding:8px 28px 8px 28px;">
<p style="${heading}">Si el código no funciona</p>
<p style="${small}">El código se invalida tras 5 intentos incorrectos o al cumplirse sus 24 horas. En ese caso, ingresa a la pantalla de activación y pulsa «Reenviar código»: recibirás uno nuevo y el anterior dejará de funcionar. Entre un reenvío y otro hay una breve espera.</p>
<p style="${small}">Número de solicitud: ${id}</p>
</td></tr>
<tr><td style="padding:4px 28px 24px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.footer};border:1px solid ${c.line};border-radius:8px;"><tr>
<td style="padding:12px 14px;font-family:${FONT};font-size:12px;line-height:18px;color:${c.muted};"><strong style="color:${c.ink};">Aviso de seguridad institucional:</strong> si no solicitaste este trámite, ignora este mensaje.</td>
</tr></table>
</td></tr>
<tr><td align="center" style="padding:18px 28px;border-top:1px solid ${c.line};background:${c.footer};font-family:${FONT};font-size:12px;line-height:18px;color:${c.muted};"><strong style="color:${c.ink};">Universidad Mayor de San Simón · Dirección General de Títulos y Grados Académicos</strong><br>Sistema Oficial UMSSPIRA — Cochabamba, Bolivia<br><span style="font-size:11px;">Este es un mensaje institucional generado automáticamente. Por favor no respondas directamente a este correo.</span></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}