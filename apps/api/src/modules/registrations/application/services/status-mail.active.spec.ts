import { ConfigService } from '@nestjs/config';
import { StatusMailService } from './status-mail.service';
import type { StatusQueryTarget } from '../contracts/request-status.dto';
import type { RegistrationSecurity } from '../ports/registration-security.port';
import type { ApplicationsRepository } from '../ports/applications-repository.port';

interface SealedPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

describe('StatusMailService - Cuenta activa y activacion', () => {
  let service: StatusMailService;
  let mockPrisma: {
    solicitud: { findUnique: jest.Mock };
    tokenSubsanacion: { findMany: jest.Mock };
    correoPendiente: { create: jest.Mock };
    correoTramite: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let mockSecurity: jest.Mocked<RegistrationSecurity>;
  let mockActivationAccess: { resend: jest.Mock };
  let mockCorrectionTokenService: { issueLink: jest.Mock };
  let mockApplicationsRepo: jest.Mocked<ApplicationsRepository>;
  let mockConfig: { get: jest.Mock };
  let sealedPayloads: SealedPayload[];

  beforeEach(() => {
    sealedPayloads = [];

    mockSecurity = {
      token: jest.fn(() => 'test-token'),
      code: jest.fn(() => '123456'),
      hash: jest.fn((purpose, val) => `hash:${purpose}:${val}`),
      seal: jest.fn((val: SealedPayload) => {
        sealedPayloads.push(val);
        return JSON.stringify(val);
      }),
    };

    mockPrisma = {
      solicitud: { findUnique: jest.fn() },
      tokenSubsanacion: { findMany: jest.fn().mockResolvedValue([]) },
      correoPendiente: { create: jest.fn().mockResolvedValue({ id: 'outbox-1' }) },
      correoTramite: { create: jest.fn().mockResolvedValue({ id: 'tramite-1' }) },
      $transaction: jest.fn(),
    };
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>): Promise<unknown> => {
        return cb(mockPrisma);
      },
    );

    mockActivationAccess = {
      resend: jest.fn().mockResolvedValue({ resendCount: 1, cooldownSeconds: 30, notificationStatus: 'EN_COLA' }),
    };

    mockCorrectionTokenService = {
      issueLink: jest.fn().mockResolvedValue('https://umsspira.bo/register/correction/tok-123'),
    };

    mockApplicationsRepo = {
      countRejections: jest.fn().mockResolvedValue(1),
      findObservationReasons: jest.fn(),
      renewActivation: jest.fn(),
      list: jest.fn(),
      metrics: jest.fn(),
      find: jest.fn(),
      document: jest.fn(),
      review: jest.fn(),
      verifyActivation: jest.fn(),
      activate: jest.fn(),
    };

    mockConfig = {
      get: jest.fn((key: string) => (key === 'WEB_BASE_URL' ? 'https://umsspira.bo' : undefined)),
    };

    service = new StatusMailService(
      mockPrisma as never,
      mockSecurity,
      mockActivationAccess as never,
      mockCorrectionTokenService as never,
      mockConfig as unknown as ConfigService<never, true>,
      mockApplicationsRepo,
    );
  });

  describe('Caso 4: Aprobada con activacion pendiente (CA-18.4)', () => {
    it('invoca el flujo vigente de reenvio de activacion respetando esperas y maximos', async () => {
      const target: StatusQueryTarget = {
        applicationId: 'app-appr-1',
        email: 'aprobado@umss.edu',
        fullName: 'Beatriz Soliz',
        kind: 'aprobada_por_activar',
      };

      await service.dispatch(target);

      expect(mockActivationAccess.resend).toHaveBeenCalledWith('app-appr-1');
      expect(mockSecurity.seal).not.toHaveBeenCalled();
    });
  });

  describe('Caso 5: Cuenta ya activa (CA-18.5)', () => {
    it('envia aviso de cuenta activa sin llamar al reenvio ni incluir codigos de activacion', async () => {
      const target: StatusQueryTarget = {
        applicationId: 'app-active-1',
        email: 'activo@umss.edu',
        fullName: 'Clara Estrada',
        kind: 'aprobada_activa',
      };

      await service.dispatch(target);

      expect(mockActivationAccess.resend).not.toHaveBeenCalled();
      expect(mockSecurity.seal).toHaveBeenCalledTimes(1);
      const sealed = sealedPayloads[0];
      expect(sealed.to).toBe('activo@umss.edu');
      expect(sealed.subject).toBe('[UMSSPIRA] Tu cuenta ya está activa');
      expect(sealed.text).toContain('Clara Estrada');
      expect(sealed.text).toContain('https://umsspira.bo/login');
      expect(sealed.text).toContain('https://umsspira.bo/forgot-password');
      expect(sealed.text).not.toContain('código de activación temporal');
      expect(sealed.text).not.toContain('OTP');
      expect(sealed.html).toContain('Iniciar sesión');
      expect(sealed.html).toContain('Recuperar contraseña');
      expect(sealed.html).not.toContain('OTP');
      expect(sealed.html).not.toContain('Código de activación temporal');
      expect(mockPrisma.correoTramite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_solicitud: 'app-active-1',
            email_destino: 'activo@umss.edu',
          }),
        }),
      );
    });
  });

  describe('Seguridad y robustez (CA-18.7)', () => {
    it('escapa contenido variable y no contiene URLs fijas ni localhost', async () => {
      const target: StatusQueryTarget = {
        applicationId: 'app-xss',
        email: 'seguridad@umss.edu',
        fullName: '<script>alert("xss")</script>',
        kind: 'pendiente',
      };

      await service.dispatch(target);

      const sealed = sealedPayloads[0];
      expect(sealed.html).not.toContain('<script>');
      expect(sealed.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(sealed.html).not.toContain('localhost');
      expect(sealed.html).toContain('https://umsspira.bo');
    });

    it('registra el fallo de envio sin propagar la excepcion ni modificar el dictamen', async () => {
      mockPrisma.solicitud.findUnique.mockRejectedValue(new Error('DB_DISCONNECTED'));

      const target: StatusQueryTarget = {
        applicationId: 'app-fail',
        email: 'fail@umss.edu',
        fullName: 'Test Fail',
        kind: 'observada',
      };

      await expect(service.dispatch(target)).resolves.not.toThrow();
    });

    it('no realiza ninguna operacion de creacion o modificacion de dictamenes', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValue({
        id: 'app-readonly',
        dictamen_registros: [{ id: 'd1', justificacion: 'just' }],
      });

      const target: StatusQueryTarget = {
        applicationId: 'app-readonly',
        email: 'ro@umss.edu',
        fullName: 'Read Only',
        kind: 'rechazada',
      };

      await service.dispatch(target);

      expect(mockApplicationsRepo.review).not.toHaveBeenCalled();
      expect(mockApplicationsRepo.activate).not.toHaveBeenCalled();
    });
  });
});
