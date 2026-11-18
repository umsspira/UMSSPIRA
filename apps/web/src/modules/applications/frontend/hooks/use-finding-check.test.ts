import { act, renderHook, waitFor } from '@testing-library/react';
import { useFindingCheck, STALE_FINDING_MESSAGE } from './use-finding-check';
import * as boardService from '../services/applications-board.service';

jest.mock('../services/applications-board.service', () => ({
  fetchFindingChecks: jest.fn(),
  saveFindingCheck: jest.fn(),
}));

describe('useFindingCheck', () => {
  const fetchMock = boardService.fetchFindingChecks as jest.Mock;
  const saveMock = boardService.saveFindingCheck as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({ ok: true, data: [] });
  });

  it('carga las comprobaciones existentes al inicializar (CA-14.3)', async () => {
    const existing: boardService.HumanFindingCheck = {
      field: 'career',
      action: 'CONFIRMADO',
      author: 'admin@umss.edu',
      checkedAt: '2026-11-17T18:00:00.000Z',
      version: 1,
    };
    fetchMock.mockResolvedValueOnce({ ok: true, data: [existing] });

    const { result } = renderHook(() =>
      useFindingCheck({ applicationId: 'app-1', expectedVersion: 1 }),
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getCheckForField('career')).toEqual(existing);
    expect(result.current.getCheckForField('unknown')).toBeUndefined();
  });

  it('guarda una comprobación de tipo CONFIRMADO exitosamente', async () => {
    const savedCheck: boardService.HumanFindingCheck = {
      field: 'ci',
      action: 'CONFIRMADO',
      author: 'admin@umss.edu',
      checkedAt: '2026-11-17T19:00:00.000Z',
      version: 1,
    };
    saveMock.mockResolvedValueOnce({ ok: true, data: savedCheck });
    const onSaved = jest.fn();

    const { result } = renderHook(() =>
      useFindingCheck({
        applicationId: 'app-1',
        expectedVersion: 1,
        currentAuthor: 'admin@umss.edu',
        onSaved,
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.saveCheck({ field: 'ci', action: 'CONFIRMADO' });
    });

    expect(ok).toBe(true);
    expect(saveMock).toHaveBeenCalledWith(
      'app-1',
      {
        field: 'ci',
        action: 'CONFIRMADO',
        verifiedValue: undefined,
        reason: undefined,
        author: 'admin@umss.edu',
        expectedVersion: 1,
      },
      1,
    );
    expect(result.current.getCheckForField('ci')).toEqual(savedCheck);
    expect(onSaved).toHaveBeenCalledWith(savedCheck);
  });

  it('valida que CORREGIDO requiera valor comprobado no vacío', async () => {
    const { result } = renderHook(() =>
      useFindingCheck({ applicationId: 'app-1', expectedVersion: 1 }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.saveCheck({
        field: 'graduationYear',
        action: 'CORREGIDO',
        verifiedValue: '   ',
      });
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Debes ingresar el valor comprobado manualmente.');
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('valida que NO_VERIFICABLE requiera explicación obligatoria', async () => {
    const { result } = renderHook(() =>
      useFindingCheck({ applicationId: 'app-1', expectedVersion: 1 }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.saveCheck({
        field: 'sisCode',
        action: 'NO_VERIFICABLE',
        reason: '',
      });
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Debes indicar la explicación de por qué no es verificable.');
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('detecta vista desactualizada al recibir 409 del servidor (CA-14.7)', async () => {
    saveMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      needsLogin: false,
      message: 'La solicitud cambió; actualiza el expediente.',
    });
    const onRefreshNeeded = jest.fn();

    const { result } = renderHook(() =>
      useFindingCheck({
        applicationId: 'app-1',
        expectedVersion: 1,
        onRefreshNeeded,
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.saveCheck({ field: 'career', action: 'CONFIRMADO' });
    });

    expect(ok).toBe(false);
    expect(result.current.stale).toBe(true);
    expect(result.current.error).toBe(STALE_FINDING_MESSAGE);
    expect(onRefreshNeeded).toHaveBeenCalled();

    // Intentos posteriores mientras stale deben ser rechazados inmediatamente
    let secondTry = true;
    await act(async () => {
      secondTry = await result.current.saveCheck({ field: 'ci', action: 'CONFIRMADO' });
    });
    expect(secondTry).toBe(false);
    expect(result.current.error).toBe(STALE_FINDING_MESSAGE);
  });
});
