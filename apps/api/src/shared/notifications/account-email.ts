// Misma paleta, cabecera y tarjeta que los correos de dictamen. Tablas y estilos
// en línea para mantener compatibilidad con los clientes de correo.
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function httpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function layout(origin: string, title: string, content: string): string {
  const logo = httpUrl(origin.replace(/\/+$/, '') + '/assets/events/umsspira-logo-desktop.png');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#FAF6EE;font-family:'Inter','Segoe UI',Helvetica,Arial,sans-serif;color:#1B2632;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:632px;background:#EEE9DF;border:1px solid #D9D2C5;border-radius:18px;"><tr><td style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E0D9CB;border-radius:14px;overflow:hidden;">
<tr><td style="background:#0F172A;padding:20px 28px;">
${logo ? `<img src="${escape(logo)}" alt="UMSSPIRA" height="30" style="display:block;border:0;height:30px;width:auto;color:#FFFFFF;">` : '<strong style="color:#FFFFFF;">UMSSPIRA</strong>'}
<p style="margin:12px 0 0;color:#D5D9E0;font-size:11px;letter-spacing:1px;">UNIVERSIDAD MAYOR DE SAN SIMÓN</p></td></tr>
<tr><td style="padding:32px 28px;"><h1 style="margin:0 0 24px;font-size:26px;line-height:34px;">${escape(title)}</h1>
${content}
<div style="margin-top:28px;padding:18px;background:#EEE9DF;border:1px solid #D9D2C5;border-radius:10px;font-size:13px;line-height:21px;">
<strong>Aviso de seguridad institucional</strong><br>No compartas tu código ni tu enlace de acceso. UMSSPIRA nunca te pedirá tu contraseña por correo.</div></td></tr>
<tr><td style="padding:20px 28px;background:#F7F3EA;border-top:1px solid #E0D9CB;color:#5B616B;font-size:12px;line-height:20px;">UMSSPIRA · Universidad Mayor de San Simón<br>Este es un mensaje automático.</td></tr>
</table></td></tr></table></td></tr></table></body></html>`;
}

export function registrationCodeHtml(code: string, origin: string, minutes: number): string {
  const digits = code.split('').map(digit => `<td align="center" style="padding:12px 4px;font-size:38px;font-weight:700;color:#1B2632;">${escape(digit)}</td>`).join('');
  return layout(origin, 'Verifica tu correo', `
<p style="font-size:15px;line-height:24px;color:#3D4551;">Ingresa este código en el paso 2 de tu registro para verificar tu correo electrónico.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEE9DF;border:1px solid #C9C1B1;border-radius:10px;"><tr>${digits}</tr></table>
<p style="font-size:14px;line-height:22px;"><strong>Válido por ${minutes} minutos desde su emisión.</strong></p>
<p style="font-size:14px;line-height:22px;color:#5B616B;">Si no solicitaste este código, ignora este correo.</p>`);
}

// Se presenta el texto ya encolado: no se regeneran tokens ni se cambian sus plazos.
export function passwordRecoveryHtml(text: string, origin: string): string {
  const link = (text.match(/https?:\/\/[^\s<>"']+/g) ?? []).map(httpUrl).find(url =>
    url && new URL(url).pathname === '/reset-password');
  const paragraphs = text.split(/\r?\n/).map(line => escape(line)).join('<br>');
  return layout(origin, 'Restablece tu contraseña', `
<p style="font-size:15px;line-height:24px;color:#3D4551;overflow-wrap:anywhere;">${paragraphs}</p>
${link ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td align="center" style="background:#FFB162;border-radius:8px;"><a href="${escape(link)}" style="display:inline-block;padding:16px 24px;color:#1B2632;font-weight:700;text-decoration:none;">Crear nueva contraseña</a></td></tr></table>` : ''}`);
}
