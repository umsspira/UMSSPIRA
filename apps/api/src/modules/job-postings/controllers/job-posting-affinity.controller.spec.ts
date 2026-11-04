import { BadRequestException } from '@nestjs/common';
import { JobPostingAffinityController } from './job-posting-affinity.controller';
import { JobPostingAffinityService } from '../services/job-posting-affinity.service';
import { NlpMatcherService } from '../services/nlp-matcher.service';
import type { VacancyAffinityResponse } from '@umsspira/shared-types';

describe('JobPostingAffinityController', () => {
  let controller: JobPostingAffinityController;
  let service: JobPostingAffinityService;

  beforeEach(() => {
    const nlpMatcher = new NlpMatcherService();
    service = new JobPostingAffinityService(nlpMatcher);
    controller = new JobPostingAffinityController(service);
  });

  it('debe arrojar BadRequestException si no se provee egresadoId en query ni en header', async () => {
    await expect(controller.getAffinity('vac-1', '', undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debe aceptar egresadoId por parámetro de query', async () => {
    const mockResponse: VacancyAffinityResponse = {
      idVacante: 'vac-1',
      idEgresado: 'egresado-123',
      porcentaje: 85,
      estado: 'SUCCESS',
      mensaje: 'Afinidad calculada',
      calculadoEn: new Date().toISOString(),
    };

    jest.spyOn(service, 'calculateAffinity').mockResolvedValue(mockResponse);

    const result = await controller.getAffinity('vac-1', 'egresado-123', undefined);

    expect(result).toBe(mockResponse);
    expect(service.calculateAffinity).toHaveBeenCalledWith(
      'vac-1',
      'egresado-123',
      { forceNlpFailure: false },
    );
  });

  it('debe aceptar egresadoId por header x-egresado-id si no viene en query', async () => {
    const mockResponse: VacancyAffinityResponse = {
      idVacante: 'vac-2',
      idEgresado: 'egresado-header',
      porcentaje: 90,
      estado: 'SUCCESS',
      mensaje: 'Afinidad calculada',
      calculadoEn: new Date().toISOString(),
    };

    jest.spyOn(service, 'calculateAffinity').mockResolvedValue(mockResponse);

    const result = await controller.getAffinity('vac-2', undefined, 'egresado-header');

    expect(result).toBe(mockResponse);
    expect(service.calculateAffinity).toHaveBeenCalledWith(
      'vac-2',
      'egresado-header',
      { forceNlpFailure: false },
    );
  });

  it('debe propagar simulateNlpFailure al servicio', async () => {
    const mockResponse: VacancyAffinityResponse = {
      idVacante: 'vac-3',
      idEgresado: 'egresado-1',
      porcentaje: null,
      estado: 'NLP_ERROR',
      mensaje: 'Error NLP',
      calculadoEn: new Date().toISOString(),
    };

    jest.spyOn(service, 'calculateAffinity').mockResolvedValue(mockResponse);

    const result = await controller.getAffinity(
      'vac-3',
      'egresado-1',
      undefined,
      'true',
    );

    expect(result.estado).toBe('NLP_ERROR');
    expect(service.calculateAffinity).toHaveBeenCalledWith(
      'vac-3',
      'egresado-1',
      { forceNlpFailure: true },
    );
  });
});
