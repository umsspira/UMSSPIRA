const COLOR = {
  page: '#f3eee3',
  card: '#ffffff',
  header: '#0f172a',
  accent: '#ffb05a',
  ink: '#1f2937',
  muted: '#6b7280',
  panel: '#efe9dc',
  line: '#d9d2c0',
};
const FONT = "Inter, 'Segoe UI', Helvetica, Arial, sans-serif";

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
  const small = `margin:0 0 8px 0;font-size:13px;line-height:20px;color:${c.muted};`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Solicitud aprobada</title>
</head>
<body style="margin:0;padding:0;background:${c.page};font-family:${FONT};color:${c.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${c.card};border-radius:12px;overflow:hidden;">
<tr><td style="background:${c.header};padding:18px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="left"><img src="${logo}" alt="UMSSPIRA" height="32" style="display:block;border:0;height:32px;font-size:18px;font-weight:700;color:#ffffff;"></td>
<td align="right" style="font-size:11px;letter-spacing:1px;color:#cbd5e1;text-transform:uppercase;">Universidad Mayor de San Simón</td>
</tr></table>
</td></tr>
<tr><td align="center" style="padding:32px 28px 8px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td align="center" width="56" height="56" style="width:56px;height:56px;border-radius:28px;background:${c.accent};color:${c.ink};font-size:28px;font-weight:700;line-height:56px;">&#10003;</td>
</tr></table>
<h1 style="margin:20px 0 8px 0;font-size:26px;line-height:32px;color:${c.ink};">¡Tu solicitud fue aprobada!</h1>
<p style="margin:0;font-size:15px;line-height:24px;color:${c.muted};">${hello}<br>tu solicitud de registro fue revisada y aprobada. Ya puedes activar tu cuenta.</p>
</td></tr>
<tr><td style="padding:20px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.panel};border:1px solid ${c.line};border-radius:12px;"><tr>
<td align="center" style="padding:20px;">
<div style="font-size:11px;letter-spacing:1.5px;font-weight:700;color:${c.muted};text-transform:uppercase;">Código de activación</div>
<div style="margin:12px 0;padding:14px 8px 14px 18px;background:#ffffff;border-radius:8px;font-size:34px;font-weight:700;letter-spacing:10px;color:${c.ink};">${code}</div>
<div style="font-size:13px;color:${c.muted};">Vigencia de 24 horas desde la recepción de este mensaje.</div>
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:4px 28px 8px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td bgcolor="${c.accent}" style="border-radius:8px;"><a href="${link}" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${c.ink};text-decoration:none;">Activar mi cuenta</a></td>
</tr></table>
<p style="margin:16px 0 0 0;font-size:12px;line-height:18px;color:${c.muted};">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${link}" style="color:${c.muted};word-break:break-all;">${link}</a></p>
</td></tr>
<tr><td style="padding:16px 28px 24px 28px;">
<p style="${small}">El código tiene 6 dígitos y se invalida tras 5 intentos incorrectos. Si vence, solicita uno nuevo con «Reenviar código» en la pantalla de activación.</p>
<p style="${small}">Número de solicitud: ${id}</p>
<p style="${small}">Si no solicitaste este trámite, ignora este mensaje.</p>
</td></tr>
<tr><td align="center" style="padding:18px 28px;border-top:1px solid ${c.line};background:#faf7f0;font-size:12px;line-height:18px;color:${c.muted};">Universidad Mayor de San Simón · Sistema UMSSPIRA<br>Este es un mensaje automático. Por favor no respondas a este correo.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}