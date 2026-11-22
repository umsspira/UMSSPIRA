// HU-01: el servicio de postulantes usa la API real de Épica 4.
jest.mock('./api-client', () => {
  const actual = jest.requireActual('./api-client');
  return { ...actual, apiClient: jest.fn() };
});

const { apiClient, ApiClientError } = require('./api-client') as typeof import('./api-client');
const service = require('./applicants') as typeof import('./applicants');

const VACANTE = '44500000-0000-4000-8000-000000000001';
const raw = {
  id: '44800000-0000-4000-8000-000000000001',
  name: 'Ana Rojas',
  email: 'ana.rojas.demo@umsspira.local',
  stage: 'en_revision',
  appliedAt: '2026-11-02T00:00:00.000Z',
  hasCv: false,
  cvUrl: null,
  matchPercentage: 92,
};

describe('servicio de postulantes con la API real (HU-15)', () => {
  const apiClientMock = apiClient as unknown as jest.Mock;

  beforeEach(() => apiClientMock.mockReset());

  it('consulta la lista y calcula afinidad por lote con la sesión autenticada', async () => {
    apiClientMock
      .mockResolvedValueOnce([raw])
      .mockResolvedValueOnce({
        data: [{
          vacancyId: VACANTE,
          applicationId: raw.id,
          result: {
            status: 'ready',
            percentage: 72,
            calculatedAt: '2026-11-20T12:00:00.000Z',
            comparison: [
              { requirement: 'TypeScript', matchedSkill: 'TypeScript', result: 'exact' },
              { requirement: 'Docker', matchedSkill: null, result: 'not-found' },
            ],
          },
          error: null,
        }],
      });

    const applicants = await service.getApplicantsByVacancy(VACANTE);

    expect(apiClientMock).toHaveBeenCalledWith(
      `/api/v1/vacantes/${VACANTE}/postulantes`,
      { method: 'GET', authenticated: true },
    );
    expect(apiClientMock).toHaveBeenLastCalledWith('/api/v1/affinity/batch', {
      method: 'POST',
      authenticated: true,
      body: { mode: 'applicants', vacancyId: VACANTE, applicationIds: [raw.id] },
    });
    expect(applicants[0]).toMatchObject({
      matchPercentage: 72,
      matchStatus: 'ready',
      matchCalculatedAt: '2026-11-20T12:00:00.000Z',
      comparison: [
        { requirement: 'TypeScript', matchedSkill: 'TypeScript', result: 'exact' },
        { requirement: 'Docker', matchedSkill: null, result: 'not-found' },
      ],
      matchError: null,
    });
  });

  it('prioriza el porcentaje real del motor y ordena los postulantes descendentemente', async () => {
    const second = { ...raw, id: '44800000-0000-4000-8000-000000000002', name: 'Beto' };
    apiClientMock.mockResolvedValueOnce([
      raw,
      { ...second, stage: 'entrevista', matchPercentage: 99 },
    ]).mockResolvedValueOnce({
      data: [
        {
          vacancyId: VACANTE,
          applicationId: raw.id,
          result: { status: 'ready', percentage: 40, calculatedAt: '2026-11-20T12:00:00.000Z', comparison: [] },
          error: null,
        },
        {
          vacancyId: VACANTE,
          applicationId: second.id,
          result: { status: 'ready', percentage: 85, calculatedAt: '2026-11-20T12:00:00.000Z', comparison: [] },
          error: null,
        },
      ],
    });

    const lista = await service.getApplicantsByVacancy(VACANTE);

    expect(lista.map((applicant) => [applicant.name, applicant.matchPercentage])).toEqual([
      ['Beto', 85],
      ['Ana Rojas', 40],
    ]);
    expect(lista[0]?.status).toBe('Entrevista');
  });

  it('muestra el error del motor si la API falla o la vacante no es accesible (CA-09)', async () => {
    apiClientMock.mockRejectedValueOnce(new ApiClientError('interno', 500));
    await expect(service.getApplicantsByVacancy(VACANTE)).rejects.toBeInstanceOf(service.MatchEngineError);

    apiClientMock.mockRejectedValueOnce(new ApiClientError('no encontrado', 404));
    await expect(service.getApplicantsByVacancy(VACANTE)).rejects.toBeInstanceOf(service.MatchEngineError);
  });

  it('rechaza una respuesta que no es una lista', async () => {
    apiClientMock.mockResolvedValueOnce({ data: [] });
    await expect(service.getApplicantsByVacancy(VACANTE)).rejects.toBeInstanceOf(service.MatchEngineError);
  });

  it('divide las solicitudes en lotes de hasta 50 postulaciones', async () => {
    const records = Array.from({ length: 51 }, (_, index) => ({
      ...raw,
      id: `44800000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    }));
    apiClientMock.mockResolvedValueOnce(records);
    apiClientMock.mockResolvedValueOnce({
      data: records.slice(0, 50).map((record) => ({
        vacancyId: VACANTE,
        applicationId: record.id,
        result: { status: 'ready', percentage: 50, calculatedAt: '2026-11-20T12:00:00.000Z', comparison: [] },
        error: null,
      })),
    });
    apiClientMock.mockResolvedValueOnce({
      data: [{
        vacancyId: VACANTE,
        applicationId: records[50]!.id,
        result: { status: 'ready', percentage: 50, calculatedAt: '2026-11-20T12:00:00.000Z', comparison: [] },
        error: null,
      }],
    });

    await service.getApplicantsByVacancy(VACANTE);

    const batchCalls = apiClientMock.mock.calls.filter(([path]) => path === '/api/v1/affinity/batch');
    expect(batchCalls).toHaveLength(2);
    expect(batchCalls[0][1].body.applicationIds).toHaveLength(50);
    expect(batchCalls[1][1].body.applicationIds).toHaveLength(1);
  });

  it('preserva los errores individuales sin inventar desglose y conserva el porcentaje guardado', async () => {
    apiClientMock.mockResolvedValueOnce([raw]).mockResolvedValueOnce({
      data: [{
        vacancyId: VACANTE,
        applicationId: raw.id,
        result: null,
        error: { code: 'AFFINITY_CALCULATION_FAILED', message: 'No se pudo calcular', retryable: true },
      }],
    });

    const [applicant] = await service.getApplicantsByVacancy(VACANTE);

    expect(applicant).toMatchObject({
      matchPercentage: 92,
      matchStatus: null,
      matchCalculatedAt: null,
      comparison: [],
      matchError: 'No se pudo calcular',
    });
  });

  it('muestra la lista aunque el cálculo por lote falle, con el último resultado guardado', async () => {
    const guardado = { ...raw, matchCalculatedAt: '2026-11-19T10:00:00.000Z' };
    apiClientMock
      .mockResolvedValueOnce([guardado])
      .mockRejectedValueOnce(new ApiClientError('servicio no disponible', 503));

    const lista = await service.getApplicantsByVacancy(VACANTE);

    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({
      name: 'Ana Rojas',
      matchPercentage: 92,
      matchCalculatedAt: '2026-11-19T10:00:00.000Z',
      matchStatus: null,
      comparison: [],
      matchError: service.AFFINITY_UNAVAILABLE_MESSAGE,
    });
  });

  it('marca solo al postulante con respuesta inválida y no tumba al resto', async () => {
    const second = { ...raw, id: '44800000-0000-4000-8000-000000000002', name: 'Beto', matchPercentage: null };
    apiClientMock.mockResolvedValueOnce([raw, second]).mockResolvedValueOnce({
      data: [
        {
          vacancyId: VACANTE,
          applicationId: raw.id,
          result: { status: 'ready', percentage: 150, calculatedAt: 'no-es-fecha', comparison: [] },
          error: null,
        },
        {
          vacancyId: VACANTE,
          applicationId: second.id,
          result: { status: 'ready', percentage: 60, calculatedAt: '2026-11-20T12:00:00.000Z', comparison: [] },
          error: null,
        },
      ],
    });

    const lista = await service.getApplicantsByVacancy(VACANTE);

    expect(lista.find((a) => a.name === 'Beto')).toMatchObject({ matchPercentage: 60, matchError: null });
    expect(lista.find((a) => a.name === 'Ana Rojas')).toMatchObject({
      matchPercentage: 92,
      matchError: service.AFFINITY_UNAVAILABLE_MESSAGE,
    });
  });

  it('marca como no disponible a quien el lote no devolvió', async () => {
    apiClientMock.mockResolvedValueOnce([raw]).mockResolvedValueOnce({ data: [] });

    const [applicant] = await service.getApplicantsByVacancy(VACANTE);

    expect(applicant.matchError).toBe(service.AFFINITY_UNAVAILABLE_MESSAGE);
  });

  it('conserva el estado sin requisitos sin inventar porcentaje ni fecha', async () => {
    apiClientMock.mockResolvedValueOnce([raw]).mockResolvedValueOnce({
      data: [{
        vacancyId: VACANTE,
        applicationId: raw.id,
        result: {
          status: 'no-requirements',
          percentage: null,
          calculatedAt: null,
          comparison: [],
        },
        error: null,
      }],
    });

    const [applicant] = await service.getApplicantsByVacancy(VACANTE);

    expect(applicant).toMatchObject({
      matchPercentage: null,
      matchStatus: 'no-requirements',
      matchCalculatedAt: null,
      comparison: [],
      matchError: null,
    });
  });

  it('muestra el detalle aunque el cálculo por lote falle', async () => {
    apiClientMock
      .mockResolvedValueOnce(raw)
      .mockRejectedValueOnce(new ApiClientError('no encontrado', 404));

    await expect(service.getApplicantById(VACANTE, raw.id)).resolves.toMatchObject({
      id: raw.id,
      matchPercentage: 92,
      matchError: service.AFFINITY_UNAVAILABLE_MESSAGE,
    });
  });

  it('devuelve null en el detalle cuando el postulante no existe', async () => {
    apiClientMock.mockRejectedValueOnce(new ApiClientError('no encontrado', 404));

    await expect(service.getApplicantById(VACANTE, 'otro')).resolves.toBeNull();
  });

  it('devuelve el detalle normalizado', async () => {
    apiClientMock
      .mockResolvedValueOnce(raw)
      .mockResolvedValueOnce({
        data: [{
          vacancyId: VACANTE,
          applicationId: raw.id,
          result: {
            status: 'ready',
            percentage: 92,
            calculatedAt: '2026-11-20T12:00:00.000Z',
            comparison: [{ requirement: 'Node.js', matchedSkill: 'Node.js', result: 'exact' }],
          },
          error: null,
        }],
      });

    await expect(service.getApplicantById(VACANTE, raw.id)).resolves.toMatchObject({
      id: raw.id,
      status: 'En revisión',
      matchPercentage: 92,
      comparison: [{ requirement: 'Node.js', matchedSkill: 'Node.js', result: 'exact' }],
    });
    expect(apiClientMock).toHaveBeenCalledWith(
      `/api/v1/vacantes/${VACANTE}/postulantes/${raw.id}`,
      { method: 'GET', authenticated: true },
    );
  });

  it('indica si el postulante subió su CV (HU-16)', async () => {
    apiClientMock.mockResolvedValueOnce([{ ...raw, hasCv: true }, raw]);

    const [conCv, sinCv] = await service.getApplicantsByVacancy(VACANTE);

    expect(conCv.hasCv).toBe(true);
    expect(sinCv.hasCv).toBe(false);
  });

  it('lee experiencia, formación y certificaciones del perfil (HU-16 CA-07)', async () => {
    apiClientMock.mockResolvedValueOnce({
      ...raw,
      workExperience: [
        { position: 'Desarrolladora backend', company: 'Empresa Andina', startDate: '2024-02-01', endDate: null },
        { position: '', company: '' },
      ],
      education: [
        { title: 'Licenciatura en Ingeniería de Sistemas', institution: 'UMSS', graduationYear: 2023, level: 'Licenciatura' },
      ],
      certifications: [
        { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon', level: 'Básico', year: 2025 },
        'no es un registro',
      ],
    });

    const detalle = await service.getApplicantById(VACANTE, raw.id);

    expect(detalle?.workExperience).toEqual([
      { position: 'Desarrolladora backend', company: 'Empresa Andina', startDate: '2024-02-01', endDate: null },
    ]);
    expect(detalle?.education).toEqual([
      { title: 'Licenciatura en Ingeniería de Sistemas', institution: 'UMSS', graduationYear: 2023, level: 'Licenciatura' },
    ]);
    expect(detalle?.certifications).toEqual([
      { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon', level: 'Básico', year: 2025 },
    ]);
  });

  it('deja listas vacías si la API no envía esos registros', async () => {
    apiClientMock.mockResolvedValueOnce(raw);

    const detalle = await service.getApplicantById(VACANTE, raw.id);

    expect(detalle).toMatchObject({ workExperience: [], education: [], certifications: [] });
  });

  it('guarda la etapa con apiClient (sesión y CSRF) y el código del backend (HU-04)', async () => {
    apiClientMock.mockResolvedValueOnce({ id: raw.id, estado: 'entrevista' });

    await service.updateApplicantStage(VACANTE, raw.id, 'Entrevista');

    expect(apiClientMock).toHaveBeenCalledWith(
      `/api/v1/vacantes/${VACANTE}/postulantes/${raw.id}/etapa`,
      { method: 'PATCH', authenticated: true, body: { etapa: 'entrevista' } },
    );
  });

  it('muestra el mensaje de la API si rechaza la etapa y uno genérico si falla el servidor', async () => {
    apiClientMock.mockRejectedValueOnce(new ApiClientError('La vacante no pertenece a tu empresa', 403));
    await expect(service.updateApplicantStage(VACANTE, raw.id, 'Descartado')).rejects.toThrow(
      'La vacante no pertenece a tu empresa',
    );

    apiClientMock.mockRejectedValueOnce(new ApiClientError('interno', 500));
    await expect(service.updateApplicantStage(VACANTE, raw.id, 'Descartado')).rejects.toThrow(
      service.STAGE_UPDATE_ERROR_MESSAGE,
    );
  });
});

describe('modo de datos de prueba (deuda 3 de Épica 5)', () => {
  it('usa la API real si NEXT_PUBLIC_USE_MOCK no está definida', async () => {
    const previous = process.env.NEXT_PUBLIC_USE_MOCK;
    delete process.env.NEXT_PUBLIC_USE_MOCK;
    try {
      await jest.isolateModulesAsync(async () => {
        const { apiClient: isolatedClient } = require('./api-client') as typeof import('./api-client');
        const isolated = require('./applicants') as typeof import('./applicants');
        (isolatedClient as unknown as jest.Mock).mockReset();
        (isolatedClient as unknown as jest.Mock)
          .mockResolvedValueOnce([raw])
          .mockResolvedValueOnce({
            data: [{
              vacancyId: VACANTE,
              applicationId: raw.id,
              result: { status: 'ready', percentage: 70, calculatedAt: '2026-11-20T12:00:00.000Z', comparison: [] },
              error: null,
            }],
          });

        const lista = await isolated.getApplicantsByVacancy(VACANTE);

        expect(isolatedClient).toHaveBeenCalledTimes(2);
        expect(lista[0].name).toBe('Ana Rojas');
      });
    } finally {
      process.env.NEXT_PUBLIC_USE_MOCK = previous;
    }
  });
});
