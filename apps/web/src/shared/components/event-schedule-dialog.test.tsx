import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EventScheduleDialog } from './event-schedule-dialog';

const event = {
  title: 'Seminario de IA Aplicada',
  dateLabel: '05 dic 2099 · 10:00–12:00',
  location: 'Auditorio',
  maxCapacity: 80,
};

describe('programar publicación', () => {
  it('rechaza una fecha pasada sin guardar', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);

    render(
      <EventScheduleDialog
        event={event}
        isSubmitting={false}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText('Fecha de publicación *'), {
      target: { value: '2020-01-01' },
    });
    fireEvent.change(screen.getByLabelText('Hora de publicación *'), {
      target: { value: '08:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar programación' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La fecha y hora deben ser posteriores al momento actual.',
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('envía una fecha futura al confirmar', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);

    render(
      <EventScheduleDialog
        event={event}
        isSubmitting={false}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText('Fecha de publicación *'), {
      target: { value: '2099-11-25' },
    });
    fireEvent.change(screen.getByLabelText('Hora de publicación *'), {
      target: { value: '08:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar programación' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        new Date('2099-11-25T08:00').toISOString(),
      );
    });
  });
});
