import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AyudaBolsaTrabajoPage from '@/app/(dashboard)/ayuda/bolsa-de-trabajo/page';
import { AyudaBolsaTrabajo } from './ayuda-bolsa-trabajo';

const TITULADO_TITLES = [
  '1. Buscar una vacante',
  '2. Ver la afinidad',
  '3. Postularse',
  '4. Subir el CV',
];
const RECLUTADOR_TITLES = [
  '1. Publicar una vacante',
  '2. Ver los postulantes',
  '3. Evaluar a un postulante',
  '4. Descargar el CV',
];

describe('Ayuda · Bolsa de trabajo (T20.2)', () => {
  it('renderiza la página oficial con tres pestañas y Titulado seleccionado', () => {
    render(<AyudaBolsaTrabajoPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Ayuda · Bolsa de trabajo' })).toBeVisible();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Titulado', 'Reclutador', 'Cómo funciona la afinidad',
    ]);
    expect(screen.getByRole('tab', { name: 'Titulado' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Titulado' })).toBeVisible();
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it.each([
    ['titulado', 'Titulado'],
    ['reclutador', 'Reclutador'],
    ['afinidad', 'Cómo funciona la afinidad'],
    ['desconocido', 'Titulado'],
  ])('abre la pestaña correcta al entrar con ?tab=%s', (tab, expectedLabel) => {
    render(<AyudaBolsaTrabajoPage searchParams={{ tab }} />);

    expect(screen.getByRole('tab', { name: expectedLabel })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: expectedLabel })).toBeVisible();
  });

  it('usa Titulado si el parámetro tab está repetido', () => {
    render(<AyudaBolsaTrabajoPage searchParams={{ tab: ['reclutador', 'afinidad'] }} />);

    expect(screen.getByRole('tab', { name: 'Titulado' })).toHaveAttribute('aria-selected', 'true');
  });

  it.each([
    { tab: 'Titulado', titles: TITULADO_TITLES, hrefs: ['/job-postings', '/job-postings', '/job-postings', '/profile'] },
    { tab: 'Reclutador', titles: RECLUTADOR_TITLES, hrefs: ['/empresa/vacantes/publicar', '/empresa/mis-vacantes', '/empresa/mis-vacantes', '/empresa/mis-vacantes'] },
  ])('$tab muestra exactamente cuatro pasos, en orden, con imagen, explicación y navegación válida', ({ tab, titles, hrefs }) => {
    render(<AyudaBolsaTrabajo />);
    fireEvent.click(screen.getByRole('tab', { name: tab }));
    const panel = screen.getByRole('tabpanel', { name: tab });
    const cards = within(panel).getAllByRole('article');

    expect(cards).toHaveLength(4);
    expect(within(panel).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(titles);
    cards.forEach((card, index) => {
      const image = within(card).getByRole('img');
      expect(image).toHaveAttribute('alt', expect.stringMatching(/\S/));
      expect(image.getAttribute('alt')).not.toMatch(/mockup/i);
      expect(card.querySelector('p')).toHaveTextContent(/\S/);

      const destination = within(card).getByRole('link', { name: 'Ir a la pantalla' });
      expect(destination).toHaveAttribute('href', hrefs[index]);
      expect(destination).toHaveAccessibleDescription(titles[index]);

      const fullImage = within(card).getByRole('link', { name: /^Ampliar imagen:/ });
      const imagePath = fullImage.getAttribute('href');
      expect(imagePath).toMatch(/^\/ayuda\/[a-z-]+\.png$/);
      expect(fullImage).toHaveAttribute('target', '_blank');
      // Comprueba los recursos entregados, no solo una ruta declarada en JSX.
      const bytes = readFileSync(join(process.cwd(), 'public', imagePath!));
      expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(bytes.readUInt32BE(16)).toBe(1365);
      expect(bytes.readUInt32BE(20)).toBe(735);
    });
  });

  it('permite cambiar entre las tres pestañas sin mostrar pasos de otra guía', () => {
    render(<AyudaBolsaTrabajo />);

    fireEvent.click(screen.getByRole('tab', { name: 'Reclutador' }));
    expect(screen.getByRole('heading', { name: '3. Evaluar a un postulante' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '1. Buscar una vacante' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Cómo funciona la afinidad' }));
    expect(screen.getByRole('heading', { name: 'Contenido de afinidad pendiente' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Ir a la pantalla' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Titulado' }));
    expect(screen.getByRole('heading', { name: '1. Buscar una vacante' })).toBeVisible();
  });

  it('mantiene asociados los tabs y sus paneles, con un solo tab en el orden de foco', () => {
    render(<AyudaBolsaTrabajo />);
    const tabs = screen.getAllByRole('tab');

    expect(screen.getByRole('tablist', { name: 'Guías de la bolsa de trabajo' })).toBeVisible();
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    tabs.forEach((tab) => {
      const panel = document.getElementById(tab.getAttribute('aria-controls')!);
      expect(panel).toHaveAttribute('role', 'tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
      expect(panel).toHaveAttribute('tabindex', '0');
    });
  });

  it('permite navegar con flechas, Home y End, moviendo selección y foco', () => {
    render(<AyudaBolsaTrabajo />);
    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();

    for (const [key, selectedIndex] of [
      ['ArrowRight', 1], ['ArrowDown', 2], ['ArrowRight', 0],
      ['ArrowLeft', 2], ['ArrowUp', 1], ['Home', 0], ['End', 2],
    ] as const) {
      fireEvent.keyDown(document.activeElement!, { key });
      expect(tabs[selectedIndex]).toHaveFocus();
      expect(tabs[selectedIndex]).toHaveAttribute('aria-selected', 'true');
      expect(tabs.filter((tab) => tab.tabIndex === 0)).toEqual([tabs[selectedIndex]]);
    }
  });

  it('no muestra avisos de funciones pendientes ni textos de imagen provisional (HU-16 ya está integrada)', () => {
    render(<AyudaBolsaTrabajo />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(/todavía no está disponible/)).not.toBeInTheDocument();
    expect(screen.queryByText(/provisional|mockup/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Reclutador' }));
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(/todavía no está disponible/)).not.toBeInTheDocument();
  });

  it('permite integrar el contenido de Miguel sin implementar su fórmula ni su ventana', () => {
    render(<AyudaBolsaTrabajo initialTab="afinidad" affinityContent={<p>Contenido oficial de afinidad</p>} />);

    expect(screen.getByText('Contenido oficial de afinidad')).toBeVisible();
    expect(screen.queryByText('Contenido de afinidad pendiente')).not.toBeInTheDocument();
  });
});
