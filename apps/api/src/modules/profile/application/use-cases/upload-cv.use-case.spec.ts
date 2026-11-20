import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import type { ProfileRepository } from '../ports/profile-repository.port';
import { CV_TYPE_MESSAGE } from '../../domain/policies/cv-file.policy';
import { UploadCvUseCase } from './upload-cv.use-case';

const actor: ActorContext = {
  id: 'usuario-1',
  email: 'titulado@example.com',
  name: 'María Pérez',
  role: 'titulado',
  credentialVersion: 1,
  permissions: ['perfil:self:write'],
  scopes: { graduateId: 'titulado-1', companyIds: [], careerIds: [] },
};

const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

function upload(originalname: string, buffer = pdf): UploadedFileData {
  return { originalname, buffer };
}

function setup(replaced = false) {
  const repository = {
    saveCv: jest.fn().mockImplementation(async (_scope, file) => ({
      ...file,
      uploadedAt: new Date('2026-11-20T12:00:00.000Z'),
      replaced,
    })),
  };
  const useCase = new UploadCvUseCase(repository as unknown as ProfileRepository);
  return { repository, useCase };
}

describe('UploadCvUseCase (HU-16 T16.2)', () => {
  it('guarda un PDF válido para el titulado autenticado', async () => {
    const { repository, useCase } = setup();

    const result = await useCase.execute(actor, upload('mi-cv.pdf'));

    expect(repository.saveCv).toHaveBeenCalledWith(
      { graduateId: 'titulado-1', userId: 'usuario-1' },
      expect.objectContaining({ name: 'mi-cv.pdf', mime: 'application/pdf', size: pdf.length }),
    );
    expect(result).toMatchObject({ name: 'mi-cv.pdf', size: pdf.length, replaced: false });
  });

  it('rechaza la solicitud sin archivo', async () => {
    const { repository, useCase } = setup();

    await expect(useCase.execute(actor)).rejects.toThrow('Adjunta tu CV en formato PDF');
    expect(repository.saveCv).not.toHaveBeenCalled();
  });

  it('rechaza un archivo que no es PDF', async () => {
    const { repository, useCase } = setup();

    await expect(useCase.execute(actor, upload('mi-cv.docx'))).rejects.toThrow(CV_TYPE_MESSAGE);
    expect(repository.saveCv).not.toHaveBeenCalled();
  });

  it('marca replaced solo cuando ya existía un CV', async () => {
    const { useCase } = setup(true);

    await expect(useCase.execute(actor, upload('mi-cv-nuevo.pdf'))).resolves.toMatchObject({
      replaced: true,
    });
  });
});
