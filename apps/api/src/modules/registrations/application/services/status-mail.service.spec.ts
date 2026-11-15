import { ConfigService } from '@nestjs/config';
import { StatusMailService } from './status-mail.service';
import type { StatusQueryTarget } from '../contracts/request-status.dto';
import type { RegistrationSecurity } from '../ports/registration-security.port';
import type { ApplicationsRepository } from '../ports/applications-repository.port';

interface SealedPayload { to: string; subject: string; text: string; html?: string; }

describe('StatusMailService - Dictamenes y pendiente', () => {
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
      async (cb: (tx: unknown) => Promise<unknown>): Promise<unknown> => cb(mockPrisma),
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

  describe('Caso 1: Solicitud pendiente (CA-18.6)', () => {
    it('genera correo institucional de estado pendiente y lo encola al correo verificado', async () => {
      const target: StatusQueryTarget = {
        applicationId: 'app-pend-1',
        email: 'estudiante@umss.edu',
        fullName: 'Laura Morales',
        kind: 'pendiente',
      };

      await service.dispatch(target);

      expect(mockSecurity.seal).toHaveBeenCalledTimes(1);
      const sealed = sealedPayloads[0];
      expect(sealed.to).toBe('estudiante@umss.edu');
      expect(sealed.subject).toBe('[UMSSPIRA] Tu solicitud de registro continúa en revisión');
      expect(sealed.text).toContain('Laura Morales');
      expect(sealed.text).toContain('app-pend-1');
      expect(sealed.text).toContain('continúa en proceso de revisión');
      expect(sealed.html).toContain('En revisión institucional');
      expect(mockPrisma.correoTramite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email_destino: 'estudiante@umss.edu',
            id_solicitud: 'app-pend-1',
            asunto: '[UMSSPIRA] Tu solicitud de registro continúa en revisión',
          }),
        }),
      );
      expect(mockActivationAccess.resend).not.toHaveBeenCalled();
    });
  });

  describe('Caso 2: Solicitud observada (CA-18.3)', () => {
    it('reutiliza correo de observacion con motivos comunicables y enlace de subsanacion', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValue({
        id: 'app-obs-1',
        dictamen_registros: [
          {
            id: 'rev-obs-1',
            categoria: 'Documentación incompleta',
            justificacion: 'Falta la legalización del diploma académico',
            motivos: [
              { motivo: { id: 1, etiqueta: 'Diploma sin sello' } },
              { motivo: { id: 2, etiqueta: 'Copia borrosa' } },
            ],
          },
        ],
      });

      const target: StatusQueryTarget = {
        applicationId: 'app-obs-1',
        email: 'observado@umss.edu',
        fullName: 'Mario Vargas',
        kind: 'observada',
      };

      await service.dispatch(target);

      expect(mockCorrectionTokenService.issueLink).toHaveBeenCalledWith('app-obs-1');
      const sealed = sealedPayloads[0];
      expect(sealed.to).toBe('observado@umss.edu');
      expect(sealed.subject).toContain('Tu solicitud de registro requiere correcciones');
      expect(sealed.text).toContain('Diploma sin sello');
      expect(sealed.text).toContain('Copia borrosa');
      expect(sealed.text).toContain('Falta la legalización del diploma académico');
      expect(sealed.text).toContain('https://umsspira.bo/register/correction/tok-123');
      expect(mockPrisma.correoTramite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_solicitud: 'app-obs-1',
            id_dictamen: 'rev-obs-1',
            tipo: 'observacion',
          }),
        }),
      );
    });

    it('respeta limites de subsanacion: no emite enlace si supero el tope diario', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValue({
        id: 'app-obs-limit',
        dictamen_registros: [{ id: 'rev-1', justificacion: 'Obs' }],
      });
      mockPrisma.tokenSubsanacion.findMany.mockResolvedValue([
        { id: 't1', created_at: new Date() },
        { id: 't2', created_at: new Date() },
        { id: 't3', created_at: new Date() },
      ]);

      const target: StatusQueryTarget = {
        applicationId: 'app-obs-limit',
        email: 'limit@umss.edu',
        fullName: 'Test',
        kind: 'observada',
      };

      await service.dispatch(target);

      expect(mockCorrectionTokenService.issueLink).not.toHaveBeenCalled();
      expect(mockSecurity.seal).not.toHaveBeenCalled();
    });

    it('respeta cooldown de subsanacion: no emite enlace si esta en tiempo de espera', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValue({
        id: 'app-obs-cool',
        dictamen_registros: [{ id: 'rev-2', justificacion: 'Obs' }],
      });
      mockPrisma.tokenSubsanacion.findMany.mockResolvedValue([
        { id: 't1', created_at: new Date(Date.now() - 10_000) },
      ]);

      const target: StatusQueryTarget = {
        applicationId: 'app-obs-cool',
        email: 'cool@umss.edu',
        fullName: 'Test',
        kind: 'observada',
      };

      await service.dispatch(target);

      expect(mockCorrectionTokenService.issueLink).not.toHaveBeenCalled();
      expect(mockSecurity.seal).not.toHaveBeenCalled();
    });
  });

  describe('Caso 3: Solicitud rechazada (CA-18.3)', () => {
    it('reutiliza correo de rechazo con justificacion comunicable e intentos restantes', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValue({
        id: 'app-rej-1',
        dictamen_registros: [
          {
            id: 'rev-rej-1',
            categoria: 'No cumple requisitos',
            justificacion: 'Carrera no acreditada en convenio',
          },
        ],
      });
      mockApplicationsRepo.countRejections.mockResolvedValue(2);

      const target: StatusQueryTarget = {
        applicationId: 'app-rej-1',
        email: 'rechazado@umss.edu',
        fullName: 'Roberto Gómez',
        kind: 'rechazada',
      };

      await service.dispatch(target);

      expect(mockApplicationsRepo.countRejections).toHaveBeenCalledWith('app-rej-1');
      const sealed = sealedPayloads[0];
      expect(sealed.to).toBe('rechazado@umss.edu');
      expect(sealed.subject).toContain('resultado de tu solicitud');
      expect(sealed.text).toContain('Carrera no acreditada en convenio');
      expect(sealed.text).toContain('3 intentos');
      expect(sealed.text).toContain('https://umsspira.bo/register');
      expect(mockPrisma.correoTramite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_solicitud: 'app-rej-1',
            id_dictamen: 'rev-rej-1',
            tipo: 'rechazo',
          }),
        }),
      );
    });
  });
});
