import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { RequestsTable } from './requests-table';
import { useOcrRunner } from '@/modules/applications/frontend/hooks/use-ocr-runner';

jest.mock('@/modules/applications/frontend/hooks/use-ocr-runner', () => ({
  useOcrRunner: jest.fn(),
}));

jest.mock('@/modules/applications/frontend/hooks/use-ocr-statuses', () => ({
  useOcrStatuses: () => ({ 's-1': 'COMPLETADO' }),
  OCR_STATUS_LABELS: {
    COMPLETADO: 'OCR completado',
  },
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, onClick, ...rest }: { children: React.ReactNode; href: string; onClick?: (e: React.MouseEvent) => void }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

const mockSearchParams = new URLSearchParams('page=2&search=carlos&career=sistemas');
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

const sampleItems = [
  {
    id: 's-1',
    code: 'EGR-2026-001',
    fullName: 'Carlos Mamani',
    email: 'carlos@umss.edu',
    ci: '8912345',
    issuedIn: 'LP',
    sisCode: '202009876',
    career: 'Ingeniería de Sistemas',
    careerId: 'c-1',
    status: 'PENDIENTE' as const,
    submittedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
  },
];

describe('RequestsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inicia automáticamente useOcrRunner al renderizar la tabla', () => {
    render(
      <RequestsTable
        items={sampleItems}
        total={1}
        page={2}
        pageSize={15}
        onPageChange={jest.fn()}
        onPageSizeChange={jest.fn()}
      />,
    );

    expect(useOcrRunner).toHaveBeenCalled();
  });

  it('muestra el estado del OCR por solicitud', () => {
    render(
      <RequestsTable
        items={sampleItems}
        total={1}
        page={2}
        pageSize={15}
        onPageChange={jest.fn()}
        onPageSizeChange={jest.fn()}
      />,
    );

    expect(screen.getByText('OCR completado')).toBeInTheDocument();
  });

  it('incluye enlace al expediente en pagina propia conservando filtros y pagina', () => {
    render(
      <RequestsTable
        items={sampleItems}
        total={1}
        page={2}
        pageSize={15}
        onPageChange={jest.fn()}
        onPageSizeChange={jest.fn()}
      />,
    );

    const link = screen.getByRole('link', { name: /Ver expediente EGR-2026-001/i });
    expect(link).toHaveAttribute(
      'href',
      '/applications/s-1?page=2&search=carlos&career=sistemas',
    );
  });

  it('invoca onSelect al pulsar la fila si está presente', () => {
    const handleSelect = jest.fn();
    render(
      <RequestsTable
        items={sampleItems}
        total={1}
        page={2}
        pageSize={15}
        onPageChange={jest.fn()}
        onPageSizeChange={jest.fn()}
        onSelect={handleSelect}
      />,
    );

    fireEvent.click(screen.getByText('Carlos Mamani'));
    expect(handleSelect).toHaveBeenCalledWith('s-1');
  });
});
