import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import type { ProfileRecord } from '@/modules/profile/types/profile-record';

import { DeleteRecordModal } from './delete-record-modal';

const REGISTRO = {
  id: 'f1',
  institution: 'Universidad Mayor de San Simón',
  title: 'Ingeniería de Sistemas',
  graduationYear: '2025',
  degree: 'Licenciatura',
} as unknown as ProfileRecord;

function renderModal(onCancel = jest.fn(), isDeleting = false) {
  render(
    <DeleteRecordModal
      section="education"
      record={REGISTRO}
      isDeleting={isDeleting}
      errorCode={null}
      onConfirm={jest.fn()}
      onCancel={onCancel}
    />,
  );
  return onCancel;
}

describe('DeleteRecordModal · aviso centrado', () => {
  it('se muestra centrado sobre un fondo que cubre la pantalla', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toHaveTextContent('¿Estás seguro de que deseas eliminar este registro?');
    expect(screen.getByTestId('delete-record-overlay')).toHaveClass('fixed', 'inset-0', 'items-center', 'justify-center');
  });

  it('clic en el fondo cancela; clic dentro del aviso no', () => {
    const onCancel = renderModal();

    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('delete-record-overlay'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('mientras se elimina, clic en el fondo no cancela', () => {
    const onCancel = renderModal(jest.fn(), true);

    fireEvent.click(screen.getByTestId('delete-record-overlay'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
