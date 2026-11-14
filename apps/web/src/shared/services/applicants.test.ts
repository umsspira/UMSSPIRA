// HU-01: el servicio de postulantes usa la API real de Épica 4.
jest.mock('./api-client', () => {
  const actual = jest.requireActual('./api-client');
  return { ...actual, apiClient: jest.fn() };
});

// USE_MOCK se lee al cargar el módulo: se fija antes de importarlo.
const originalUseMock = process.env.NEXT_PUBLIC_USE_MOCK;
process.env.NEXT_PUBLIC_USE_MOCK = 'false';
const { apiClient, ApiClientError } = require('./api-client') as typeof import('./api-client');
const service = require('./applicants') as typeof import('./applicants');

const VACANTE = '44500000-0000-4000-8000-000000000001';
const raw = {
  id: '44800000-0000-4000-8000-000000000001',
  name: 'Ana Rojas',
  email: 'ana.rojas.demo@umsspira.local',
  location: null,
  experienceLevel: null,
  stage: 'en_revision',
  appliedAt: '2026-11-02T00:00:00.000Z',
  hasCv: false,
  cvUrl: null,
  matchPercentage: 92,
  skills: null,
};

describe('servicio de postulantes con la API real (HU-01)', () => {
  const apiClientMock = apiClient as unknown as jest.Mock;

  afterAll(() => {
    process.env.NEXT_PUBLIC_USE_MOCK = originalUseMock;
  });

  beforeEach(() => apiClientMock.mockReset());

  it('consulta el endpoint de Épica 4 con la sesión del usuario', async () => {
    apiClientMock.mockResolvedValueOnce([raw]);

    await service.getApplicantsByVacancy(VACANTE);

    expect(apiClientMock).toHaveBeenCalledWith(
      `/api/v1/vacantes/${VACANTE}/postulantes`,
      { method: 'GET', authenticated: true },
    );
  });

  it('traduce el código de etapa y deja vacíos los datos no registrados', async () => {
    apiClientMock.mockResolvedValueOnce([
      raw,
      { ...raw, id: '2', stage: 'entrevista', matchPercentage: null },
    ]);

    const lista = await service.getApplicantsByVacancy(VACANTE);

    expect(lista[0]).toMatchObject({ status: 'En revisión', location: null, experienceLevel: null, matchPercentage: 92 });
    expect(lista[1]).toMatchObject({ status: 'Entrevistado', matchPercentage: null });
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

  it('devuelve null en el detalle cuando el postulante no existe', async () => {
    apiClientMock.mockRejectedValueOnce(new ApiClientError('no encontrado', 404));

    await expect(service.getApplicantById(VACANTE, 'otro')).resolves.toBeNull();
  });

  it('devuelve el detalle normalizado', async () => {
    apiClientMock.mockResolvedValueOnce(raw);

    await expect(service.getApplicantById(VACANTE, raw.id)).resolves.toMatchObject({
      id: raw.id,
      status: 'En revisión',
    });
    expect(apiClientMock).toHaveBeenCalledWith(
      `/api/v1/vacantes/${VACANTE}/postulantes/${raw.id}`,
      { method: 'GET', authenticated: true },
    );
  });
});