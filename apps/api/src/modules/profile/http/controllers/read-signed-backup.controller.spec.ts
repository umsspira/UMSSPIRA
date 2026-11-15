import type { Response } from 'express';
import { ReadSignedBackupController } from './read-signed-backup.controller';
import type { ReadSignedBackupUseCase } from '../../application/use-cases/read-signed-backup.use-case';

describe('ReadSignedBackupController', () => {
  it.each([
    ['certificado.jpg', 'image/jpeg'],
    ['certificado.pdf', 'application/pdf'],
  ])('sirve %s con su tipo MIME original y disposición inline', async (name, mime) => {
    const useCase = {
      execute: jest
        .fn()
        .mockResolvedValue({ id: 'backup', name, mime, size: 10, bytes: new Uint8Array([1]) }),
    };
    const response = {
      type: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const controller = new ReadSignedBackupController(
      useCase as unknown as ReadSignedBackupUseCase,
    );

    await controller.handle(
      'backup-id',
      { expira: 1, firma: 'valid-signature' },
      response as unknown as Response,
    );

    expect(response.type).toHaveBeenCalledWith(mime);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining(`filename*=UTF-8''${encodeURIComponent(name)}`),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('inline;'),
    );
    expect(response.send).toHaveBeenCalledWith(Buffer.from([1]));
  });

  it('sirve el respaldo como adjunto cuando se solicita descarga', async () => {
    const useCase = {
      execute: jest
        .fn()
        .mockResolvedValue({
          id: 'backup',
          name: 'certificado.pdf',
          mime: 'application/pdf',
          size: 10,
          bytes: new Uint8Array([1]),
        }),
    };
    const response = {
      type: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const controller = new ReadSignedBackupController(
      useCase as unknown as ReadSignedBackupUseCase,
    );

    await controller.handle(
      'backup-id',
      { expira: 1, firma: 'valid-signature', descargar: '1' },
      response as unknown as Response,
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('attachment;'),
    );
  });
});
