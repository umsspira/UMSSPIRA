import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { PROFILE_RECORDS_MOCK } from '@/modules/profile/testing/profile-fixtures';
import { ProfileStoreProvider, useProfileStore } from '@/modules/profile/state/profile-store';
import type { EducationRecord, ExperienceRecord } from '@/modules/profile/types/profile-record';

import { EditEducationForm } from './edit-education-form';
import { EditExperienceForm } from './edit-experience-form';
import { EditRecordLayout, RecordNotFound } from './edit-record-layout';

const push = jest.fn();
let routeId = '';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: routeId }),
  useRouter: () => ({ push }),
}));

function StoredValues() {
  const { records } = useProfileStore();
  const education = (records.education as EducationRecord[]).find((record) => record.id === routeId);
  const experience = (records.experience as ExperienceRecord[]).find((record) => record.id === routeId);
  return <p data-testid="guardado">{education?.institution ?? experience?.company}</p>;
}

function renderWith(form: React.ReactNode) {
  render(
    <ProfileStoreProvider initialRecords={PROFILE_RECORDS_MOCK}>
      {form}
      <StoredValues />
    </ProfileStoreProvider>,
  );
}

describe('Pantallas de edición · botón Volver (HU-11)', () => {
  beforeEach(() => push.mockClear());

  it('el layout muestra «Volver» con el estilo compartido y llama a onCancel', () => {
    const onCancel = jest.fn();
    render(
      <EditRecordLayout
        title="Editar formación"
        description=""
        number="01"
        sectionTitle="Formación"
        sectionSubtitle=""
        isSaved={false}
        onSubmit={jest.fn()}
        onCancel={onCancel}
      >
        <p>campos</p>
      </EditRecordLayout>,
    );

    const back = screen.getByRole('button', { name: 'Volver a Mis registros' });
    expect(back).toHaveClass('min-h-[44px]');
    fireEvent.click(back);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('formación: «Volver» regresa a su pestaña sin guardar lo escrito', () => {
    routeId = 'edu-1';
    renderWith(<EditEducationForm />);
    const original = screen.getByTestId('guardado').textContent;

    fireEvent.change(screen.getByLabelText('Institución'), { target: { value: 'Otra institución' } });
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Mis registros' }));

    expect(push).toHaveBeenCalledWith('/profile/records?seccion=education');
    expect(screen.getByTestId('guardado')).toHaveTextContent(original ?? '');
  });

  it('experiencia: «Volver» regresa a su pestaña sin guardar lo escrito', () => {
    routeId = 'exp-1';
    renderWith(<EditExperienceForm />);
    const original = screen.getByTestId('guardado').textContent;

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'Otra empresa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Mis registros' }));

    expect(push).toHaveBeenCalledWith('/profile/records?seccion=experience');
    expect(screen.getByTestId('guardado')).toHaveTextContent(original ?? '');
  });

  it('si el registro no existe ofrece volver a Mis registros con el mismo botón', () => {
    render(<RecordNotFound label="certificación" />);

    const back = screen.getByRole('link', { name: 'Volver a mis registros' });
    expect(back).toHaveAttribute('href', '/profile/records');
    expect(back).toHaveClass('min-h-[44px]');
  });
});
