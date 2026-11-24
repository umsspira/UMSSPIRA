import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { DeleteRecordModal } from '@/modules/profile/components/delete-record-modal';
import { PROFILE_RECORDS_MOCK } from '@/modules/profile/testing/profile-fixtures';

const record = PROFILE_RECORDS_MOCK.education[0];

function renderModal(isClosing = false) {
  return render(
    <DeleteRecordModal
      section="education"
      record={record}
      isDeleting={false}
      isClosing={isClosing}
      errorCode={null}
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
    />,
  );
}

describe('DeleteRecordModal (HU-15)', () => {
  it('se muestra como ventana sobre la página, con fondo oscuro fijo', () => {
    renderModal();

    const dialog = screen.getByRole('dialog', { name: /eliminar este registro/i });
    const overlay = dialog.parentElement as HTMLElement;
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50', 'profile-modal-backdrop');
    expect(dialog).toHaveClass('profile-modal-content');
  });

  it('muestra una sola tarjeta de confirmación (no una dentro de otra)', () => {
    const { container } = renderModal();

    expect(container.querySelectorAll('.rounded-2xl.bg-white')).toHaveLength(1);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('al cerrar anima la salida del fondo y de la tarjeta', () => {
    renderModal(true);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('profile-modal-content-out');
    expect(dialog.parentElement).toHaveClass('profile-modal-backdrop-out');
  });
});
