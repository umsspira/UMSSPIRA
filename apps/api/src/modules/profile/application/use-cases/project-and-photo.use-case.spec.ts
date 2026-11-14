import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import type { ProfileRepository } from '../ports/profile-repository.port';
import { PROFILE_PHOTO_MESSAGE } from '../../domain/policies/profile-photo.policy';
import { projectSchema, profileChangeSchema, PROJECT_URL_MESSAGE } from '../../http/schemas/profile.schemas';
import { presentProfileRecord } from '../../http/presenters/profile.presenter';
import { CreateProjectUseCase } from './create-project.use-case';
import { ReadProfilePhotoUseCase, SaveProfilePhotoUseCase } from './profile-photo.use-case';

const actor: ActorContext = {
  id: 'usuario-1',
  email: 'titulado@example.com',
  name: 'María Pérez',
  role: 'titulado',
  credentialVersion: 1,
  permissions: ['perfil:self:write'],
  scopes: { graduateId: 'titulado-1', companyIds: [], careerIds: [] },
};
const scope = { graduateId: 'titulado-1', userId: 'usuario-1' };
const project = { nombre: 'Portafolio', enlace: 'https://mi-sitio.dev', descripcion: 'Mis trabajos' };

function upload(bytes: number[]): UploadedFileData {
  return { originalname: 'foto.jpg', buffer: Buffer.from(bytes) } as unknown as UploadedFileData;
}

describe('Proyectos (HU-19)', () => {
  it('T19.2: el enlace tiene que ser https válido', () => {
    expect(projectSchema.safeParse(project).success).toBe(true);
    for (const enlace of ['http://mi-sitio.dev', 'javascript:alert(1)', 'mi-sitio.dev']) {
      const result = projectSchema.safeParse({ ...project, enlace });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(PROJECT_URL_MESSAGE);
    }
  });

  it('T19.3: las tecnologías son opcionales y editar usa la sección «proyectos»', () => {
    expect(projectSchema.safeParse({ ...project, tecnologias: 'React, Nest' }).success).toBe(true);
    expect(profileChangeSchema.safeParse({ section: 'proyectos', data: project }).success).toBe(true);
    expect(profileChangeSchema.safeParse({ section: 'proyectos', data: { ...project, enlace: 'http://x.dev' } }).success).toBe(false);
  });

  it('T19.3: crea el proyecto en el perfil del titulado autenticado', async () => {
    const repository = { createProject: jest.fn().mockResolvedValue({ id: 'p-1' }) };
    await new CreateProjectUseCase(repository as unknown as ProfileRepository).execute(actor, project);
    expect(repository.createProject).toHaveBeenCalledWith(scope, project);
  });

  it('T19.3: el proyecto se presenta con sus campos en español', () => {
    const presented = presentProfileRecord({
      kind: 'project',
      id: 'p-1',
      graduateId: 'titulado-1',
      createdAt: new Date('2026-11-13T10:00:00.000Z'),
      name: 'Portafolio',
      url: 'https://mi-sitio.dev',
      description: 'Mis trabajos',
      technologies: null,
    });
    expect(presented).toEqual({
      id: 'p-1',
      idTitulado: 'titulado-1',
      fechaCreacion: '2026-11-13T10:00:00.000Z',
      nombre: 'Portafolio',
      enlace: 'https://mi-sitio.dev',
      descripcion: 'Mis trabajos',
      tecnologias: null,
    });
  });
});

describe('Foto de perfil (HU-16, T16.2)', () => {
  it('guarda una foto JPG del titulado autenticado', async () => {
    const repository = { savePhoto: jest.fn().mockResolvedValue(undefined) };
    await new SaveProfilePhotoUseCase(repository as unknown as ProfileRepository).execute(actor, upload([0xff, 0xd8, 0xff, 0xe0]));
    expect(repository.savePhoto).toHaveBeenCalledWith(scope, expect.objectContaining({ mime: 'image/jpeg', size: 4 }));
  });

  it('rechaza un PNG o la falta de archivo con el mensaje del formulario', async () => {
    const repository = { savePhoto: jest.fn() };
    const useCase = new SaveProfilePhotoUseCase(repository as unknown as ProfileRepository);
    await expect(useCase.execute(actor, upload([0x89, 0x50, 0x4e, 0x47]))).rejects.toThrow(PROFILE_PHOTO_MESSAGE);
    await expect(useCase.execute(actor)).rejects.toThrow(PROFILE_PHOTO_MESSAGE);
    expect(repository.savePhoto).not.toHaveBeenCalled();
  });

  it('rechaza una foto de más de 5 MB', async () => {
    const repository = { savePhoto: jest.fn() };
    const big = new Array(5 * 1024 * 1024 + 1).fill(0);
    big[0] = 0xff;
    big[1] = 0xd8;
    big[2] = 0xff;
    await expect(
      new SaveProfilePhotoUseCase(repository as unknown as ProfileRepository).execute(actor, upload(big)),
    ).rejects.toThrow(PROFILE_PHOTO_MESSAGE);
  });

  it('lee la foto del titulado autenticado', async () => {
    const photo = { mime: 'image/jpeg', bytes: new Uint8Array([1]), size: 1 };
    const repository = { readPhoto: jest.fn().mockResolvedValue(photo) };
    await expect(new ReadProfilePhotoUseCase(repository as unknown as ProfileRepository).execute(actor)).resolves.toBe(photo);
    expect(repository.readPhoto).toHaveBeenCalledWith(scope);
  });
});
