import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import type { ProfileRepository } from '../ports/profile-repository.port';
import { PROFILE_PHOTO_MESSAGE } from '../../domain/policies/profile-photo.policy';
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

function upload(bytes: number[]): UploadedFileData {
  return { originalname: 'foto.jpg', buffer: Buffer.from(bytes) } as unknown as UploadedFileData;
}
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

  it('rechaza una foto de m├ís de 5 MB', async () => {
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
