import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ApplicationPage from './page';

jest.mock('@/modules/applications/frontend/components/application-detail-page', () => ({
  ApplicationDetailPage: ({ applicationId }: { applicationId: string }) => (
    <div data-testid="detail-page">Expediente {applicationId}</div>
  ),
}));

describe('ApplicationPage (/applications/[id])', () => {
  it('renderiza ApplicationDetailPage pasando el id del parámetro de ruta', () => {
    render(<ApplicationPage params={{ id: 'sol-123' }} />);
    expect(screen.getByTestId('detail-page')).toHaveTextContent('Expediente sol-123');
  });
});
