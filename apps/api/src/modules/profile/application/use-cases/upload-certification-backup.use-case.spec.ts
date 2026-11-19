import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import type { ProfileRepository } from '../ports/profile-repository.port';
import { BACKUP_FILE_MESSAGE } from '../../domain/policies/backup-file.policy';
import { UploadCertificationBackupUseCase } from './upload-certification-backup.use-case';

const certificationId = '0b6f1c1e-4f7a-4c55-9a52-1f6f0d3b2a10';
const actor: ActorContext = {
  id: 'usuario-1',
  email: 'titulado@example.com',
  name: 'María Pérez',
  role: 'titulado',
  credentialVersion: 1,
  permissions: ['perfil:self:write'],
  scopes: { graduateId: 'titulado-1', companyIds: [], careerIds: [] },
};

function upload(originalname: string, bytes: number[]): UploadedFileData {
  return { originalname, buffer: Buffer.from(bytes) } as unknown as UploadedFileData;
}

function setup() {
  const repository = { saveBackup: jest.fn().mockResolvedValue({ id: 'r-1' }) };
  const useCase = new UploadCertificationBackupUseCase(repository as unknown as ProfileRepository);
  return { repository, useCase };
}

describe('UploadCertificationBackupUseCase (HU-18)', () => {
  it('guarda un PDF con su tipo en la misma certificación', async () => {
    const { repository, useCase } = setup();

    await useCase.execute(actor, certificationId, upload('titulo.pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]));

    expect(repository.saveBackup).toHaveBeenCalledTimes(1);
    expect(repository.saveBackup.mock.calls[0][1]).toBe(certificationId);
    expect(repository.saveBackup.mock.calls[0][2]).toMatchObject({ name: 'titulo.pdf', mime: 'application/pdf' });
  });

  it('guarda una foto JPG', async () => {
    const { repository, useCase } = setup();

    await useCase.execute(actor, certificationId, upload('foto.jpg', [0xff, 0xd8, 0xff, 0xe0]));

    expect(repository.saveBackup.mock.calls[0][2]).toMatchObject({ mime: 'image/jpeg' });
  });

  it('rechaza otro formato sin guardar nada', async () => {
    const { repository, useCase } = setup();

    await expect(
      useCase.execute(actor, certificationId, upload('foto.png', [0x89, 0x50, 0x4e, 0x47])),
    ).rejects.toThrow(BACKUP_FILE_MESSAGE);
    expect(repository.saveBackup).not.toHaveBeenCalled();
  });

  it('pide el archivo si no se envió ninguno', async () => {
    const { repository, useCase } = setup();

    await expect(useCase.execute(actor, certificationId)).rejects.toThrow(
      'Adjunta el respaldo PDF o JPG de la certificación',
    );
    expect(repository.saveBackup).not.toHaveBeenCalled();
  });
});
