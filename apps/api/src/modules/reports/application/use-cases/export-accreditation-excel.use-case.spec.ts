import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ExportAccreditationExcelUseCase } from './export-accreditation-excel.use-case';
describe('ExportAccreditationExcelUseCase', () => {
  const actor: ActorContext = {
    id: 'admin-1',
    email: 'admin@umss.edu.bo',
    name: 'Admin',
    role: 'administrador',
    permissions: ['reportes:read'],
    scopes: { companyIds: [], graduateId: null, careerIds: ['career-1'] },
    credentialVersion: 1,
  };
  it('lanza ACCREDITATION_EMPTY_PERIOD cuando no hay respuestas en el periodo', async () => {
    const reader = {
      read: jest.fn().mockResolvedValue({
        indicators: { totalResponses: 0 },
      }),
    };
    const writer = {
      build: jest.fn(),
    };
    const useCase = new ExportAccreditationExcelUseCase(reader as never, writer as never);
    await expect(
      useCase.execute(actor, { careerId: 'career-1', cohort: 2023, semester: '2/2026' }),
    ).rejects.toThrow(BusinessRuleError);
    await expect(
      useCase.execute(actor, { careerId: 'career-1', cohort: 2023, semester: '2/2026' }),
    ).rejects.toMatchObject({ code: 'ACCREDITATION_EMPTY_PERIOD' });
    expect(writer.build).not.toHaveBeenCalled();
  });
  it('genera el archivo excel cuando existen respuestas en el periodo', async () => {
    const report = {
      indicators: { totalResponses: 12 },
    };
    const expectedFile = {
      bytes: Buffer.from('xlsx'),
      name: 'acreditacion-sistemas-2026-11-18.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const reader = {
      read: jest.fn().mockResolvedValue(report),
    };
    const writer = {
      build: jest.fn().mockResolvedValue(expectedFile),
    };
    const useCase = new ExportAccreditationExcelUseCase(reader as never, writer as never);
    const result = await useCase.execute(actor, { careerId: 'career-1' });
    expect(reader.read).toHaveBeenCalledWith(['career-1'], { careerId: 'career-1' });
    expect(writer.build).toHaveBeenCalledWith(report);
    expect(result).toBe(expectedFile);
  });
});