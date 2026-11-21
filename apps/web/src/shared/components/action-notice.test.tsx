import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import {
  ActionNotice,
  ActionStatusNotice,
  NOTICE_SUCCESS_DURATION_MS,
  OFFLINE_ACTION_MESSAGE,
} from './action-notice';

describe('ActionNotice (HU10)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('CA-01: la carga se anuncia como status y está ocupada', () => {
    render(<ActionNotice state="loading" message="Guardando tu pase QR…" />);
    const notice = screen.getByRole('status');
    expect(notice).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Guardando tu pase QR…')).toBeInTheDocument();
  });

  it('CA-02: el éxito desaparece solo tras unos segundos', () => {
    const onDismiss = jest.fn();
    render(<ActionNotice state="success" message="QR guardado en tu dispositivo" onDismiss={onDismiss} />);

    act(() => {
      jest.advanceTimersByTime(NOTICE_SUCCESS_DURATION_MS - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('CA-03: el error explica qué pasó y ofrece «Reintentar»', () => {
    const onRetry = jest.fn();
    render(
      <ActionNotice state="error" message="No se pudo guardar el pase QR" description="Inténtalo nuevamente." onRetry={onRetry} />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Inténtalo nuevamente.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('CA-04: sin conexión muestra el mensaje acordado', () => {
    render(<ActionStatusNotice status="offline" messages={{ loading: 'a', success: 'b', error: 'c' }} />);
    expect(screen.getByText(OFFLINE_ACTION_MESSAGE)).toBeInTheDocument();
    expect(OFFLINE_ACTION_MESSAGE).toBe('Necesitas conexión para esta acción');
  });

  it('no dibuja nada en estado idle', () => {
    const { container } = render(
      <ActionStatusNotice status="idle" messages={{ loading: 'a', success: 'b', error: 'c' }} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});