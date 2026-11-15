import { PrismaSurveyRepository } from './prisma-survey.repository';

const assignment = { id: 'assignment-1', id_carrera: 'career-1' };

const draft = {
  id: 'survey-1',
  titulo: 'Encuesta 2026',
  fecha_inicio: new Date('2026-11-01'),
  fecha_fin: new Date('2026-11-30'),
  estado: 'BORRADOR',
  formato: 'WEB',
  fecha_creacion: new Date('2026-11-01'),
  id_carrera: 'career-1',
};

function createRepository(encuesta: Record<string, jest.Mock> = {}, admin = assignment) {
  const prisma = {
    administradorDeCarrera: { findFirst: jest.fn().mockResolvedValue(admin) },
    encuesta,
  };
  return { prisma, repository: new PrismaSurveyRepository(prisma as never) };
}

describe('PrismaSurveyRepository flujos de gestión', () => {
  describe('asignación del administrador', () => {
    it('rechaza si el administrador no tiene carreras', async () => {
      const { repository } = createRepository();

      await expect(repository.listManaged('user-1', [])).rejects.toThrow(
        'No tienes una carrera asignada',
      );
    });

    it('rechaza si no tiene una asignación activa en la carrera', async () => {
      const { repository } = createRepository({}, null as never);

      await expect(repository.listManaged('user-1', ['career-1'])).rejects.toThrow(
        'No tienes una carrera asignada',
      );
    });
  });

  it('lista solo las encuestas de sus carreras', async () => {
    const findMany = jest.fn().mockResolvedValue([draft]);
    const { repository } = createRepository({ findMany });

    const result = await repository.listManaged('user-1', ['career-1']);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_carrera: { in: ['career-1'] } } }),
    );
    expect(result).toEqual([
      expect.objectContaining({ id: 'survey-1', title: 'Encuesta 2026', status: 'BORRADOR' }),
    ]);
  });

  describe('updateManaged', () => {
    it('edita solo los campos enviados de una encuesta en borrador', async () => {
      const update = jest.fn().mockResolvedValue({ ...draft, titulo: 'Nuevo título' });
      const { repository } = createRepository({
        findFirst: jest.fn().mockResolvedValue(draft),
        update,
      });

      const result = await repository.updateManaged('user-1', ['career-1'], 'survey-1', {
        title: 'Nuevo título',
      });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'survey-1' },
        data: { titulo: 'Nuevo título' },
      });
      expect(result.title).toBe('Nuevo título');
    });

    it('actualiza fechas y formato cuando se envían', async () => {
      const update = jest.fn().mockResolvedValue(draft);
      const { repository } = createRepository({
        findFirst: jest.fn().mockResolvedValue(draft),
        update,
      });
      const startDate = new Date('2026-11-05');
      const endDate = new Date('2026-11-25');

      await repository.updateManaged('user-1', ['career-1'], 'survey-1', {
        startDate,
        endDate,
        format: 'PDF',
      });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'survey-1' },
        data: { fecha_inicio: startDate, fecha_fin: endDate, formato: 'PDF' },
      });
    });

    it('rechaza si la encuesta no existe en su carrera', async () => {
      const { repository } = createRepository({ findFirst: jest.fn().mockResolvedValue(null) });

      await expect(
        repository.updateManaged('user-1', ['career-1'], 'survey-x', { title: 'X' }),
      ).rejects.toThrow('Encuesta no encontrada');
    });

    it('rechaza editar una encuesta publicada', async () => {
      const { repository } = createRepository({
        findFirst: jest.fn().mockResolvedValue({ ...draft, estado: 'PUBLICADA' }),
      });

      await expect(
        repository.updateManaged('user-1', ['career-1'], 'survey-1', { title: 'X' }),
      ).rejects.toThrow('Solo se pueden editar encuestas en borrador');
    });

    it('rechaza si la nueva fecha de fin queda antes del inicio', async () => {
      const update = jest.fn();
      const { repository } = createRepository({
        findFirst: jest.fn().mockResolvedValue(draft),
        update,
      });

      await expect(
        repository.updateManaged('user-1', ['career-1'], 'survey-1', {
          endDate: new Date('2026-10-01'),
        }),
      ).rejects.toThrow('La fecha de fin no puede ser anterior a la de inicio');
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('publishManaged', () => {
    it('rechaza si la encuesta no existe en su carrera', async () => {
      const { repository } = createRepository({ findFirst: jest.fn().mockResolvedValue(null) });

      await expect(repository.publishManaged('user-1', ['career-1'], 'survey-x')).rejects.toThrow(
        'Encuesta no encontrada',
      );
    });

    it('rechaza publicar una encuesta sin fechas', async () => {
      const { repository } = createRepository({
        findFirst: jest.fn().mockResolvedValue({ ...draft, fecha_fin: null }),
      });

      await expect(repository.publishManaged('user-1', ['career-1'], 'survey-1')).rejects.toThrow(
        'La encuesta requiere fechas',
      );
    });
  });

  describe('unpublishManaged', () => {
    it('devuelve la encuesta a borrador', async () => {
      const update = jest.fn().mockResolvedValue(draft);
      const { repository } = createRepository({
        findFirst: jest.fn().mockResolvedValue({ ...draft, estado: 'PUBLICADA' }),
        update,
      });

      const result = await repository.unpublishManaged('user-1', ['career-1'], 'survey-1');

      expect(update).toHaveBeenCalledWith({
        where: { id: 'survey-1' },
        data: { estado: 'BORRADOR' },
      });
      expect(result.status).toBe('BORRADOR');
    });

    it('rechaza si la encuesta no existe en su carrera', async () => {
      const { repository } = createRepository({ findFirst: jest.fn().mockResolvedValue(null) });

      await expect(repository.unpublishManaged('user-1', ['career-1'], 'survey-x')).rejects.toThrow(
        'Encuesta no encontrada',
      );
    });
  });
});