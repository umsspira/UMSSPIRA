import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JobPostingsSearchReader } from './job-postings-search.reader';
import type { JobPostingsSearchService } from '../../search/job-postings-search.service';

describe('JobPostingsSearchReader', () => {
  const findActive = jest.fn();
  const reader = new JobPostingsSearchReader({
    findActive,
  } as unknown as JobPostingsSearchService);
  beforeEach(() => findActive.mockReset());

  it('proyecta solo UUID sin trasladar datos ni totales de Elasticsearch', async () => {
    const now = new Date();
    findActive.mockResolvedValue({
      data: [
        { id: 'ABCDEF00-0000-4000-8000-000000000001', titulo: 'No oficial' },
      ],
      total: 999,
    });
    await expect(
      reader.findIds({ search: 'Empresa', page: 2, limit: 10 }, now),
    ).resolves.toEqual(['abcdef00-0000-4000-8000-000000000001']);
    expect(findActive).toHaveBeenCalledWith(
      { search: 'Empresa', page: 2, limit: 10 },
      now,
    );
  });

  it('traduce indisponibilidad al error 503 reconocido por el filtro oficial', async () => {
    findActive.mockRejectedValue(new ServiceUnavailableException());
    await expect(
      reader.findIds({ search: 'Empresa' }, new Date()),
    ).rejects.toMatchObject({ code: 'JOB_POSTINGS_SEARCH_UNAVAILABLE' });
  });

  it('conserva los errores de validacion de HU7', async () => {
    findActive.mockRejectedValue(new BadRequestException());
    await expect(
      reader.findIds({ search: 'Empresa', page: -1 }, new Date()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
