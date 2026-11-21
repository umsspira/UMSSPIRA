/// <reference types="jest" />
import type { SurveyRepositoryPort } from '../ports/survey-repository.port';
import type { SubmitSurveyInput } from '../contracts/submit-survey.input';
import { UpdateMySurveyUseCase } from './update-my-survey.use-case';

describe('UpdateMySurveyUseCase (HU-6 T6.1)', () => {
  it('delega la única edición en el repositorio', async () => {
    const updated = { id: 'respuesta-1', edicionUsada: true, fechaActualizacion: new Date() };
    const repository = { updateOnce: jest.fn().mockResolvedValue(updated) };
    const useCase = new UpdateMySurveyUseCase(repository as unknown as SurveyRepositoryPort);
    const input = {
      idEncuesta: 'encuesta-1',
      idTitulado: 'titulado-1',
      condicionLaboral: false,
    } as SubmitSurveyInput;

    await expect(useCase.execute(input)).resolves.toBe(updated);
    expect(repository.updateOnce).toHaveBeenCalledWith(input);
  });
});
