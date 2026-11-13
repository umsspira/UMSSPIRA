import { GetCompetencyHeatmapUseCase } from './get-competency-heatmap.use-case';

describe('GetCompetencyHeatmapUseCase', () => {
  it('consulta el mapa únicamente con las carreras del administrador', async () => {
    const competencyHeatmap = jest.fn().mockResolvedValue({
      areas: [{ id: 'area-1', name: 'Tecnología' }],
      cohorts: ['2025'],
      cells: [
        {
          cohort: '2025',
          areaId: 'area-1',
          areaName: 'Tecnología',
          percentage: 80,
          graduateCount: 5,
        },
      ],
    });
    const useCase = new GetCompetencyHeatmapUseCase({ competencyHeatmap } as never);

    const result = await useCase.execute({
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'administrador',
      permissions: ['reportes:read'],
      scopes: { companyIds: [], graduateId: null, careerIds: ['career-1', 'career-2'] },
      credentialVersion: 1,
    });

    expect(competencyHeatmap).toHaveBeenCalledWith(['career-1', 'career-2']);
    expect(result.cells[0]).toMatchObject({
      areaId: 'area-1',
      percentage: 80,
      graduateCount: 5,
    });
  });

  it('rechaza al administrador sin carreras asignadas', async () => {
    const competencyHeatmap = jest.fn();
    const useCase = new GetCompetencyHeatmapUseCase({ competencyHeatmap } as never);

    expect(() =>
      useCase.execute({
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'administrador',
        permissions: ['reportes:read'],
        scopes: { companyIds: [], graduateId: null, careerIds: [] },
        credentialVersion: 1,
      }),
    ).toThrow('No tienes acceso a la carrera solicitada');
    expect(competencyHeatmap).not.toHaveBeenCalled();
  });
});
