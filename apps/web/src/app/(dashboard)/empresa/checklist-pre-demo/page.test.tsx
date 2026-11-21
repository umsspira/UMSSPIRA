import { render, screen, waitFor } from '@testing-library/react';
import ChecklistPreDemoPage from './page';

jest.mock('@/shared/services/auth-session', () => ({ ensureAccessToken: jest.fn().mockResolvedValue('tok') }));

const TODOS = [
  { id: 'migraciones', estado: 'listo', detalle: 'ok' },
  { id: 'vacantes', estado: 'listo', detalle: 'ok' },
  { id: 'login-por-rol', estado: 'listo', detalle: 'ok' },
  { id: 'afinidad-postulacion', estado: 'listo', detalle: 'ok' },
];

function mockFetch({ health = true, checklist = { ok: true, status: 200, chequeos: TODOS } as { ok: boolean; status: number; chequeos?: unknown[] } }) {
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn(async (url: string) => {
    if (url.endsWith('/health')) return { ok: health, status: health ? 200 : 503 };
    return { ok: checklist.ok, status: checklist.status, json: async () => ({ data: { chequeos: checklist.chequeos } }) };
  });
}

const estado = (id: string) => screen.getByTestId(`checklist-fila-${id}`).getAttribute('data-estado');

describe('Checklist pre-demo (HU-19)', () => {
  const original = process.env.NEXT_PUBLIC_USE_MOCK;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
    else process.env.NEXT_PUBLIC_USE_MOCK = original;
  });

  it('muestra las cinco filas del mockup y todo «Listo» cuando el ambiente está bien', async () => {
    delete process.env.NEXT_PUBLIC_USE_MOCK;
    mockFetch({});
    render(<ChecklistPreDemoPage />);
    expect(screen.getByRole('heading', { name: 'Checklist pre-demo' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('checklist-resumen')).toHaveTextContent('Todo listo para la demo.'));
    for (const id of ['migraciones', 'vacantes', 'banderas', 'login', 'afinidad']) expect(estado(id)).toBe('listo');
    expect(screen.getByText('Migraciones aplicadas en producción')).toBeInTheDocument();
    expect(screen.getByText('20261104000000 y 20261116190000')).toBeInTheDocument();
  });

  it('una migración pendiente se ve en rojo (Pendiente)', async () => {
    mockFetch({ checklist: { ok: true, status: 200, chequeos: TODOS.map((c) => (c.id === 'migraciones' ? { ...c, estado: 'pendiente' } : c)) } });
    render(<ChecklistPreDemoPage />);
    await waitFor(() => expect(estado('migraciones')).toBe('pendiente'));
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
  });

  it('con NEXT_PUBLIC_USE_MOCK=true la fila de banderas pide revisar', async () => {
    process.env.NEXT_PUBLIC_USE_MOCK = 'true';
    mockFetch({});
    render(<ChecklistPreDemoPage />);
    await waitFor(() => expect(estado('banderas')).toBe('revisar'));
    expect(screen.getByText(/NEXT_PUBLIC_USE_MOCK/, { selector: 'p.text-xs' })).toBeInTheDocument();
  });

  it('si el health de la API no responde, el listado de vacantes queda Pendiente', async () => {
    mockFetch({ health: false });
    render(<ChecklistPreDemoPage />);
    await waitFor(() => expect(estado('vacantes')).toBe('pendiente'));
  });

  it('si el endpoint del checklist responde 403 lo explica y marca los puntos como pendientes', async () => {
    mockFetch({ checklist: { ok: false, status: 403 } });
    render(<ChecklistPreDemoPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/solo empresa y administrador/));
    expect(estado('migraciones')).toBe('pendiente');
  });
});
