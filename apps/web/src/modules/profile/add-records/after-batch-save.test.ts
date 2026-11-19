import { afterBatchSave } from './after-batch-save';

describe('afterBatchSave', () => {
  it('se puede llamar con lo guardado sin fallar mientras Épica 3 no conecte el recálculo', async () => {
    await expect(afterBatchSave(3)).resolves.toBeUndefined();
    await expect(afterBatchSave(0)).resolves.toBeUndefined();
  });
});
