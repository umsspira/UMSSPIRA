import { fireEvent, render, screen } from '@testing-library/react';
import { EVENT_STATUS, type EventItem } from '@umsspira/shared-types';

import Home from './page';
import { getEventCatalog } from '@/shared/services/events-service';

jest.mock('@/shared/services/events-service', () => ({
  getEventCatalog: jest.fn(),
}));

const setOnline = (value: boolean) =>
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

const publishedEvents: EventItem[] = [
  {
    id: 'event-published-1',
    title: 'Encuentro de titulados publicado',
    description: 'Evento real',
    startDate: '2026-11-15T14:00:00Z',
    endDate: '2026-11-15T17:00:00Z',
    maxCapacity: 50,
    location: 'Campus Central',
    imageUrl: 'https://cdn.example.test/eventos/encuentro.webp',
    status: EVENT_STATUS.PUBLICADO,
    createdBy: 'admin-1',
    createdAt: '2026-10-02T10:00:00Z',
  },
];

describe('portal home upcoming events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getEventCatalog).mockResolvedValue(publishedEvents);
  });

  it('loads published events from the shared catalog and links to their portal details', async () => {
    render(<Home />);

    expect(
      await screen.findByRole('link', { name: /Encuentro de titulados publicado/ }),
    ).toHaveAttribute('href', '/portal/eventos/event-published-1');
    expect(
      screen.getByRole('img', {
        name: 'Imagen del evento Encuentro de titulados publicado',
      }),
    ).toHaveAttribute('src', 'https://cdn.example.test/eventos/encuentro.webp');
    expect(screen.getByText('Campus Central')).toBeInTheDocument();
    expect(screen.getByText(/10:00.*1:00/)).toBeInTheDocument();
    expect(getEventCatalog).toHaveBeenCalledTimes(1);
  });

  it('muestra un respaldo visual cuando un evento no tiene imagen', async () => {
    jest.mocked(getEventCatalog).mockResolvedValueOnce([
      { ...publishedEvents[0], imageUrl: null },
    ]);

    render(<Home />);

    expect(
      await screen.findByRole('img', {
        name: 'Imagen no disponible para Encuentro de titulados publicado',
      }),
    ).toBeInTheDocument();
  });
});

describe('HU09 CA-02 · acceso destacado a Mis códigos QR sin conexión', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getEventCatalog).mockResolvedValue(publishedEvents);
    setOnline(true);
  });

  afterEach(() => setOnline(true));

  it('al abrir la PWA sin conexión muestra el acceso destacado antes que el resto del contenido', async () => {
    setOnline(false);
    render(<Home />);

    const access = await screen.findByTestId('home-offline-qr-access');
    expect(access).toHaveAttribute('href', '/mis-pases');
    expect(access).toHaveTextContent('Mis códigos QR');

    // Sin recorrer el menú ni hacer scroll: el acceso está en la parte superior,
    // antes que los accesos rápidos de la grilla.
    const quickLink = screen.getByRole('link', { name: /Eventos Participa en los próximos/ });
    const order = Array.from(document.querySelectorAll('a, section'));
    expect(order.indexOf(access)).toBeGreaterThanOrEqual(0);
    expect(order.indexOf(access)).toBeLessThan(order.indexOf(quickLink));
  });

  it('con conexión no muestra el destacado offline (el quick link de Tarea 1 ya existe)', async () => {
    setOnline(true);
    render(<Home />);

    expect(screen.queryByTestId('home-offline-qr-access')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: /Mis códigos QR/ }),
    ).toHaveAttribute('href', '/mis-pases');
  });
    it('muestra el acceso a Mis códigos QR debajo de los accesos rápidos y antes de Próximos eventos cuando hay conexión', async () => {
    setOnline(true);
    const { container } = render(<Home />);

    const actions = await screen.findByTestId('home-primary-actions');
    expect(screen.getByTestId('home-online-qr-access')).toHaveAttribute('href', '/mis-pases');
    expect(screen.queryByTestId('home-online-events-access')).not.toBeInTheDocument();

    const sections = Array.from(container.querySelectorAll('section'));
    const heroIndex = sections.findIndex((section) => section.querySelector('h1'));
    const upcomingEventsIndex = sections.findIndex(
      (section) => section.querySelector('h2')?.textContent === 'Próximos eventos',
    );
    const actionsIndex = sections.indexOf(actions);

    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(upcomingEventsIndex).toBeGreaterThanOrEqual(0);
    expect(actionsIndex).toBeGreaterThan(heroIndex);
    expect(actionsIndex).toBeLessThan(upcomingEventsIndex);
  });

  it('muestra En línea / Sin conexión y el aviso solo cuando no hay red', async () => {
    setOnline(true);
    const online = render(<Home />);
    expect(screen.getByTestId('home-connection-status')).toHaveAttribute('data-estado', 'en-linea');
    expect(screen.queryByTestId('home-offline-notice')).not.toBeInTheDocument();
    online.unmount();

    setOnline(false);
    render(<Home />);
    expect(await screen.findByTestId('home-connection-status')).toHaveAttribute('data-estado', 'sin-conexion');
    expect(screen.getByTestId('home-offline-notice')).toHaveTextContent('Estás navegando sin conexión');
  });

  it('HU18: si el catálogo falla con conexión solo esa sección muestra «Reintentar» y se recupera', async () => {
    setOnline(true);
    jest.mocked(getEventCatalog).mockRejectedValueOnce(new Error('caído'));
    render(<Home />);

    const aviso = await screen.findByTestId('home-events-unavailable');
    expect(aviso).toHaveTextContent('Esta sección no está disponible.');
    expect(screen.getByTestId('home-primary-actions')).toBeInTheDocument();

    jest.mocked(getEventCatalog).mockResolvedValueOnce(publishedEvents);
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(await screen.findByRole('link', { name: /Encuentro de titulados publicado/ })).toBeInTheDocument();
    expect(screen.queryByTestId('home-events-unavailable')).not.toBeInTheDocument();
  });

  it('sin conexión y sin eventos guardados muestra la tarjeta «Sin conexión a Internet» y no «No hay eventos próximos»', async () => {
    setOnline(false);
    jest.mocked(getEventCatalog).mockResolvedValue([]);
    render(<Home />);

    expect(await screen.findByTestId('home-offline-card')).toHaveTextContent('Sin conexión a Internet');
    expect(screen.queryByText('No hay eventos próximos por ahora.')).not.toBeInTheDocument();
    // El acceso destacado a Mis códigos QR sigue estando (HU09).
    expect(screen.getByTestId('home-offline-qr-access')).toBeInTheDocument();
    setOnline(true);
  });
});
