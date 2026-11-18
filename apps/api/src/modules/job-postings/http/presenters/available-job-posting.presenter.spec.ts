import type { JobPostingDetailCandidate } from '../../application/contracts/available-job-posting';
import {
  presentAvailableJobPosting,
  presentAvailableJobPostingDetail,
} from './available-job-posting.presenter';

describe('available job posting presenters', () => {
  const posting: JobPostingDetailCandidate = {
    id: 'vacancy-1',
    title: 'Desarrollador web',
    companyName: 'Empresa',
    publicationDate: new Date('2026-11-16T10:00:00.000Z'),
    status: 'PUBLICADO',
    closingDate: null,
    technicalDescription: 'Descripción registrada',
    modality: 'REMOTO',
    experienceLevel: 'JUNIOR',
    requirements: [
      { id: 'requirement-1', name: 'Python', normalizedName: 'python' },
      { id: 'requirement-2', name: 'python', normalizedName: 'python' },
      { id: 'requirement-3', name: 'pythón', normalizedName: 'python' },
      { id: 'requirement-4', name: 'PostgreSQL', normalizedName: 'postgresql' },
    ],
  };

  it('presenta el resumen sin información ajena al listado', () => {
    expect(presentAvailableJobPosting(posting)).toEqual({
      id: 'vacancy-1',
      titulo: 'Desarrollador web',
      empresa: 'Empresa',
      descripcionTecnica: 'Descripción registrada',
      modalidad: 'REMOTO',
      fechaPublicacion: '2026-11-16T10:00:00.000Z',
    });
  });

  it('deduplica Python, python y pythón en el detalle', () => {
    expect(presentAvailableJobPostingDetail(posting).requisitos).toEqual([
      { id: 'requirement-1', nombre: 'Python' },
      { id: 'requirement-4', nombre: 'PostgreSQL' },
    ]);
  });

  it('devuelve lista vacía cuando no hay requisitos', () => {
    expect(
      presentAvailableJobPostingDetail({ ...posting, requirements: [] }).requisitos,
    ).toEqual([]);
  });
});
