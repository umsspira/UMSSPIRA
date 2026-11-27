import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { EMBED_TIMEOUT_MS } from '@/modules/profile/utils/project-embed';

import { ProjectEmbedModal } from './project-embed-modal';
import { ViewProjectButton } from './view-project-button';

const PROJECT = {
  name: 'Portafolio web',
  url: 'https://portafolio.example.com',
  description: 'Sitio personal con mis trabajos',
  technologies: ['Next.js', 'Tailwind'],
};

describe('ProjectEmbedModal (HU-20)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('CA-01: abre una ventana con el sitio dentro de un iframe aislado', () => {
    render(<ProjectEmbedModal project={PROJECT} onClose={jest.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Portafolio web' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const iframe = screen.getByTitle('Sitio del proyecto Portafolio web');
    expect(iframe).toHaveAttribute('src', PROJECT.url);
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    expect(iframe).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('CA-02: muestra «Cargando…» hasta que el sitio termina de cargar', () => {
    render(<ProjectEmbedModal project={PROJECT} onClose={jest.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    fireEvent.load(screen.getByTitle('Sitio del proyecto Portafolio web'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('CA-03: «Abrir en una pestaña nueva» abre el sitio en otra pestaña sin pasar la página de origen', () => {
    render(<ProjectEmbedModal project={PROJECT} onClose={jest.fn()} />);

    const link = screen.getByRole('link', { name: 'Abrir en una pestaña nueva' });
    expect(link).toHaveAttribute('href', PROJECT.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('CA-04: «Cerrar», Esc y clic fuera cierran la ventana; clic dentro no', () => {
    const onClose = jest.fn();
    render(<ProjectEmbedModal project={PROJECT} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');

    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('CA-05: si el sitio no carga a tiempo, muestra la tarjeta con «Este sitio no permite verse aquí.»', () => {
    render(<ProjectEmbedModal project={PROJECT} onClose={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(EMBED_TIMEOUT_MS);
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Este sitio no permite verse aquí.');
    expect(screen.queryByTitle('Sitio del proyecto Portafolio web')).not.toBeInTheDocument();
    expect(screen.getByText('Sitio personal con mis trabajos')).toBeInTheDocument();
    expect(screen.getByText('Next.js · Tailwind')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir en una pestaña nueva' })).toHaveAttribute('href', PROJECT.url);
  });

  it('CA-05: un sitio que ya cargó no pasa a bloqueado aunque pase el tiempo', () => {
    render(<ProjectEmbedModal project={PROJECT} onClose={jest.fn()} />);

    fireEvent.load(screen.getByTitle('Sitio del proyecto Portafolio web'));
    act(() => {
      jest.advanceTimersByTime(EMBED_TIMEOUT_MS * 2);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('CA-05: GitHub va directo a la tarjeta, sin intentar el iframe', () => {
    render(<ProjectEmbedModal project={{ name: 'Repo', url: 'https://github.com/g7/repo' }} onClose={jest.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Este sitio no permite verse aquí.');
    expect(screen.queryByTitle('Sitio del proyecto Repo')).not.toBeInTheDocument();
  });

  it.each(['http://inseguro.example.com', 'javascript:alert(1)', 'data:text/html,hola', 'no-es-un-enlace'])(
    'CA-06: el enlace %s no se carga dentro de la ventana',
    (url) => {
      render(<ProjectEmbedModal project={{ name: 'Proyecto', url }} onClose={jest.fn()} />);

      expect(document.querySelector('iframe')).toBeNull();
      expect(screen.getByRole('alert')).toHaveTextContent('Este sitio no permite verse aquí.');
    },
  );

  it('CA-07: en celular la ventana ocupa el ancho y los botones se reparten la fila', () => {
    render(<ProjectEmbedModal project={PROJECT} onClose={jest.fn()} />);

    expect(screen.getByRole('dialog')).toHaveClass('w-full');
    expect(screen.getByRole('button', { name: 'Cerrar' }).parentElement).toHaveClass('grid', 'grid-cols-2');
  });

  it('el foco entra a la ventana y Tab no sale de ella', () => {
    render(<ProjectEmbedModal project={PROJECT} onClose={jest.fn()} />);

    const closeIcon = screen.getByRole('button', { name: 'Cerrar ventana del proyecto' });
    const openLink = screen.getByRole('link', { name: 'Abrir en una pestaña nueva' });
    expect(closeIcon).toHaveFocus();

    openLink.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeIcon).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(openLink).toHaveFocus();
  });
});

describe('ViewProjectButton (HU-20)', () => {
  it('«Ver proyecto» abre la ventana y al cerrar el foco vuelve al botón', () => {
    render(<ViewProjectButton project={PROJECT} />);
    const button = screen.getByRole('button', { name: 'Ver proyecto' });

    fireEvent.click(button);
    expect(screen.getByRole('dialog', { name: 'Portafolio web' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});
