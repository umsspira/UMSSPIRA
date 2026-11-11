import { Logger } from '@nestjs/common';
import { PasswordResetMailWorker } from './password-reset-mail.worker';

// El worker solo usa PrismaService como tipo del constructor; se evita cargar el cliente generado.
jest.mock('../../../../shared/infrastructure/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const future = () => new Date(Date.now() + 30 * 60_000);

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'correo-1',
    email_destino: 'admin@umss.edu.bo',
    asunto: 'Asunto',
    cuerpo: 'Enlace: http://localhost:3001/reset-password?token=abc',
    intentos: 0,
    max_intentos: 3,
    token: { id_usuario: 'user-1', expira_en: future(), usado_en: null, revocado: false },
    ...overrides,
  };
}

function setup(rows: unknown[], claimed = 1) {
  const prisma = {
    passwordResetCorreo: {
      findMany: jest.fn().mockResolvedValue(rows),
      updateMany: jest.fn().mockResolvedValue({ count: claimed }),
      update: jest.fn().mockResolvedValue({}),
    },
    passwordResetEvento: { create: jest.fn().mockResolvedValue({}) },
  };
  const config = { get: jest.fn((_key: string, fallback?: string) => fallback) };
  const sendMail = jest.fn();
  const worker = new PasswordResetMailWorker(prisma as never, config as never);
  (worker as unknown as { transport: unknown }).transport = { sendMail, close: jest.fn() };
  return { prisma, sendMail, worker, config };
}

const lastUpdate = (prisma: ReturnType<typeof setup>['prisma']) =>
  prisma.passwordResetCorreo.update.mock.calls.at(-1)![0].data;

describe('PasswordResetMailWorker', () => {
  afterEach(() => jest.restoreAllMocks());

  function withBrevo(overrides: Record<string, unknown> = {}) {
    const context = setup([row({ email_destino: 'cuenta.prueba@gmail.com', ...overrides })]);
    context.config.get.mockImplementation((key, fallback) => {
      if (key === 'BREVO_API_KEY') {return 'test-api-key';}
      if (key === 'MAIL_FROM') {return 'UMSSPIRA <verificado@example.com>';}
      return fallback;
    });
    return context;
  }

  it('usa Brevo HTTP cuando está configurado y conserva el identificador de entrega', async () => {
    const { prisma, worker, sendMail } = withBrevo();
    const http = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ messageId: 'brevo-message-id' }),
    } as Response);
    await worker.drain();
    expect(sendMail).not.toHaveBeenCalled();
    expect(http).toHaveBeenCalledWith('https://api.brevo.com/v3/smtp/email', expect.objectContaining({
      method: 'POST', signal: expect.any(AbortSignal),
      headers: expect.objectContaining({ 'api-key': 'test-api-key' }),
    }));
    expect(JSON.parse(http.mock.calls[0][1]!.body as string)).toEqual({
      sender: { name: 'UMSSPIRA', email: 'verificado@example.com' },
      to: [{ email: 'cuenta.prueba@gmail.com' }], subject: 'Asunto',
      textContent: row().cuerpo,
    });
    expect(lastUpdate(prisma)).toMatchObject({ estado: 'enviada', cuerpo: null,
      smtp_message_id: 'brevo-message-id', ultimo_error: null });
  });

  it.each([401, 429, 503])('mantiene el correo pendiente ante HTTP %i de Brevo', async (status) => {
    const { prisma, worker, sendMail } = withBrevo();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status } as Response);
    await worker.drain();
    expect(lastUpdate(prisma)).toMatchObject({ estado: 'pendiente', ultimo_error: `Brevo HTTP ${status}` });
    expect(lastUpdate(prisma)).not.toHaveProperty('cuerpo');
    expect(prisma.passwordResetEvento.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('limita los reintentos también cuando Brevo no responde', async () => {
    const { prisma, worker } = withBrevo({ intentos: 2 });
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Timeout'));
    await worker.drain();
    expect(lastUpdate(prisma)).toMatchObject({ estado: 'fallida', cuerpo: null });
  });

  it('no llama a Brevo si el enlace ya fue revocado', async () => {
    const { prisma, worker } = withBrevo({
      token: { id_usuario: 'user-1', expira_en: future(), usado_en: null, revocado: true },
    });
    const http = jest.spyOn(globalThis, 'fetch');
    await worker.drain();
    expect(http).not.toHaveBeenCalled();
    expect(lastUpdate(prisma)).toMatchObject({ estado: 'fallida', ultimo_error: 'enlace_no_vigente' });
  });

  it('envía el correo, borra el cuerpo con el enlace y registra el envío (CA-12.4)', async () => {
    const { prisma, sendMail, worker } = setup([row()]);
    sendMail.mockResolvedValue({ messageId: '<abc@umsspira.local>' });

    await worker.drain();

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@umss.edu.bo',
        subject: 'Asunto',
        text: expect.stringContaining('reset-password?token=abc'),
      }),
    );
    expect(lastUpdate(prisma)).toMatchObject({ estado: 'enviada', cuerpo: null, ultimo_error: null });
    expect(prisma.passwordResetEvento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tipo: 'enlace_enviado', usuario_id: 'user-1' }),
    });
  });

  it('si el envío falla con intentos disponibles, lo deja pendiente y conserva el cuerpo', async () => {
    const { prisma, sendMail, worker } = setup([row({ intentos: 0 })]);
    sendMail.mockRejectedValue(new Error('SMTP caído'));

    await worker.drain();

    const data = lastUpdate(prisma);
    expect(data).toMatchObject({ estado: 'pendiente', ultimo_error: 'SMTP caído' });
    expect(data).not.toHaveProperty('cuerpo');
    expect(data.siguiente_intento_en.getTime()).toBeGreaterThan(Date.now());
    expect(prisma.passwordResetEvento.create).not.toHaveBeenCalled();
  });

  it('en el último intento falla de forma definitiva, borra el cuerpo y lo registra', async () => {
    const { prisma, sendMail, worker } = setup([row({ intentos: 2, max_intentos: 3 })]);
    sendMail.mockRejectedValue(new Error('SMTP caído'));

    await worker.drain();

    expect(lastUpdate(prisma)).toMatchObject({ estado: 'fallida', cuerpo: null });
    expect(prisma.passwordResetEvento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tipo: 'error_smtp' }),
    });
  });

  it.each([
    ['ya usado', { usado_en: new Date() }],
    ['reemplazado', { revocado: true }],
    ['vencido', { expira_en: new Date(Date.now() - 1000) }],
  ])('no envía un enlace %s y borra el cuerpo', async (_label, tokenOverrides) => {
    const { prisma, sendMail, worker } = setup([
      row({ token: { id_usuario: 'user-1', expira_en: future(), usado_en: null, revocado: false, ...tokenOverrides } }),
    ]);

    await worker.drain();

    expect(sendMail).not.toHaveBeenCalled();
    expect(lastUpdate(prisma)).toMatchObject({ estado: 'fallida', cuerpo: null, ultimo_error: 'enlace_no_vigente' });
  });

  it('no envía si otro proceso ya reservó el correo', async () => {
    const { sendMail, worker } = setup([row()], 0);

    await worker.drain();

    expect(sendMail).not.toHaveBeenCalled();
  });

  it('sin transporte (entorno de pruebas) no consulta la cola', async () => {
    const { prisma, worker } = setup([row()]);
    (worker as unknown as { transport: unknown }).transport = undefined;

    await worker.drain();

    expect(prisma.passwordResetCorreo.findMany).not.toHaveBeenCalled();
  });

  it('registra el motivo del fallo sin incluir el enlace ni la dirección', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const { sendMail, worker } = setup([row()]);
    sendMail.mockRejectedValue(
      Object.assign(new Error('rechazado para admin@umss.edu.bo'), { code: 'EENVELOPE' }),
    );

    await worker.drain();

    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).toContain('EENVELOPE');
    expect(logged).not.toContain('token=');
    expect(logged).not.toContain('admin@umss.edu.bo');
  });

  it('registra un error al agotar los intentos', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { sendMail, worker } = setup([row({ intentos: 2, max_intentos: 3 })]);
    sendMail.mockRejectedValue(Object.assign(new Error('caído'), { code: 'ECONNREFUSED' }));

    await worker.drain();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('ECONNREFUSED'));
  });
});
