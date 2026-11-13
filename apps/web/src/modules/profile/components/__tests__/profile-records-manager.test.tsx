import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ProfileRecordsManager } from '@/modules/profile/components/profile-records-manager';
import { clearPendingProfileChanges, hasPendingProfileChanges } from '@/shared/services/pending-profile-changes';
import { PROFILE_PROJECTS_MOCK, PROFILE_RECORDS_MOCK } from '@/modules/profile/testing/profile-fixtures';
import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import { clearAccessToken, setAccessToken } from '@/shared/services/auth-session';

// jsdom no trae fetch: se simula la respuesta del DELETE real
const fetchMock = jest.fn();

function responder(status: number, cuerpo: unknown = null) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => cuerpo });
}

function getDesktopRows() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

describe('ProfileRecordsManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    setAccessToken('test-token');
  });

  afterEach(() => {
    // @ts-expect-error se vuelve al entorno de jsdom, que no tiene fetch
    delete global.fetch;
    clearAccessToken();
  });

  it('muestra iconos de editar y eliminar en cada registro', () => {
    render(<ProfileRecordsManager initialRecords={PROFILE_RECORDS_MOCK} />);
    const rows = getDesktopRows();
    rows.forEach((row) => {
      // Editar ahora es un enlace a la pantalla de edición de la sección
      expect(within(row).getByRole('link', { name: 'Editar registro' })).toHaveAttribute('href', expect.stringMatching(/^\/profile\/education\/.+\/edit$/));
      expect(within(row).getByRole('button', { name: 'Eliminar registro' })).toBeInTheDocument();
    });
  });

  it('abre la pestaña indicada al volver de editar (BUG-HU04-003)', () => {
    render(<ProfileRecordsManager initialRecords={PROFILE_RECORDS_MOCK} initialSection="experience" />);

    expect(within(getDesktopRows()[0]).getByText('NTT DATA')).toBeInTheDocument();
    expect(getDesktopRows()).toHaveLength(PROFILE_RECORDS_MOCK.experience.length);
  });

  it('conserva la pestaña elegida en la URL para que no se pierda al recargar (BUG HU9-01)', () => {
    window.history.replaceState(null, '', '/profile/records?seccion=certification&returnTo=%2Fafinidad');
    render(<ProfileRecordsManager initialRecords={PROFILE_RECORDS_MOCK} initialSection="certification" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Formación académica' }));

    // Cambia solo la pestaña; los demás parámetros (por ejemplo returnTo) se conservan
    const params = new URLSearchParams(window.location.search);
    expect(window.location.pathname).toBe('/profile/records');
    expect(params.get('seccion')).toBe('education');
    expect(params.get('returnTo')).toBe('/afinidad');
  });

  it('pide confirmación, llama al DELETE real y quita solo ese registro sin recargar', async () => {
    responder(204);
    render(<ProfileRecordsManager initialRecords={PROFILE_RECORDS_MOCK} />);
    const [, secondRow] = getDesktopRows();
    fireEvent.click(within(secondRow).getByRole('button', { name: 'Eliminar registro' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('¿Estás seguro de que deseas eliminar este registro?')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toMatch(new RegExp(`/api/v1/perfil/formacion-academica/${PROFILE_RECORDS_MOCK.education[1].id}$`));
    expect(opciones.method).toBe('DELETE');
    expect(getDesktopRows()).toHaveLength(PROFILE_RECORDS_MOCK.education.length - 1);
    expect(screen.queryByText('Universidad Católica Boliviana')).not.toBeInTheDocument();
    expect(screen.getAllByText('Universidad Mayor de San Simón').length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent('Registro eliminado');
  });

  it('muestra error de conexión con opción de reintentar sin borrar el registro', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<ProfileRecordsManager initialRecords={PROFILE_RECORDS_MOCK} />);
    fireEvent.click(within(getDesktopRows()[0]).getByRole('button', { name: 'Eliminar registro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('No se pudo eliminar el registro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(getDesktopRows()).toHaveLength(PROFILE_RECORDS_MOCK.education.length);
  });

  it('rechaza eliminar un registro de otro egresado (403) sin modificar la lista', async () => {
    responder(403, { error: { message: 'No tienes permiso' } });
    const records = { ...PROFILE_RECORDS_MOCK, education: [PROFILE_RECORDS_MOCK.education[0]] };
    render(<ProfileRecordsManager initialRecords={records} />);
    fireEvent.click(within(getDesktopRows()[0]).getByRole('button', { name: 'Eliminar registro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('No tienes permiso para eliminar este registro')).toBeInTheDocument();
    expect(getDesktopRows()).toHaveLength(1);
  });

  describe('lista conectada a GET /api/v1/perfil (T9.1)', () => {
    const registro = { idTitulado: 'titulado-1', fechaCreacion: null };
    const perfil = {
      formacionAcademica: {
        registros: [
          { ...registro, id: 'f-1', institucion: 'Universidad Privada del Valle', titulo: 'Diplomado en Datos', grado: 'Diplomado', anioEgreso: 2024 },
        ],
      },
      experienciaLaboral: {
        registros: [{ ...registro, id: 'e-1', empresa: 'Jalasoft', cargo: 'Desarrollador', fechaInicio: '2023-02-01', fechaFin: null }],
      },
      certificaciones: { registros: [] },
    };

    function renderConectado() {
      return render(
        <ProfileStoreProvider>
          <ProfileRecordsManager />
        </ProfileStoreProvider>,
      );
    }

    it('muestra "Cargando tus registros…" sin datos de prueba mientras llega el perfil', () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      renderConectado();

      expect(screen.getByRole('status')).toHaveTextContent('Cargando tus registros…');
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.queryAllByText('Universidad Mayor de San Simón')).toHaveLength(0);
    });

    it('si falla la carga muestra el error y "Reintentar" vuelve a pedir el perfil', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      renderConectado();

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('No se pudieron cargar tus registros');
      expect(screen.queryByRole('table')).not.toBeInTheDocument();

      fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: perfil }) });
      fireEvent.click(within(alerta).getByRole('button', { name: 'Reintentar' }));

      expect((await screen.findAllByText('Universidad Privada del Valle')).length).toBeGreaterThan(0);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('muestra en cada pestaña los registros guardados en la base', async () => {
      responder(200, { data: perfil });
      renderConectado();

      expect(await screen.findByRole('table')).toBeInTheDocument();
      expect(getDesktopRows()).toHaveLength(1);
      expect(within(getDesktopRows()[0]).getByText('Universidad Privada del Valle')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('tab', { name: 'Experiencia' }));
      expect(getDesktopRows()).toHaveLength(1);
      expect(within(getDesktopRows()[0]).getByText('Jalasoft')).toBeInTheDocument();
    });

    it('muestra el estado vacío en cada pestaña sin registros', async () => {
      responder(200, {
        data: { formacionAcademica: { registros: [] }, experienciaLaboral: { registros: [] }, certificaciones: { registros: [] } },
      });
      renderConectado();

      expect(await screen.findByText('Aún no tienes registros guardados en esta sección.')).toBeInTheDocument();
      for (const pestana of ['Certificaciones', 'Experiencia']) {
        fireEvent.click(screen.getByRole('tab', { name: pestana }));
        expect(screen.getByText('Aún no tienes registros guardados en esta sección.')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      }
    });
  });

  describe('aviso de resultado al eliminar (T9.6)', () => {
    it.each([
      ['education', 'Formación académica', PROFILE_RECORDS_MOCK.education[0].id, 'formacion-academica'],
      ['experience', 'Experiencia', PROFILE_RECORDS_MOCK.experience[0].id, 'experiencia-laboral'],
      ['certification', 'Certificaciones', PROFILE_RECORDS_MOCK.certification[0].id, 'certificaciones'],
    ])('en %s muestra "Registro eliminado" y solo llama a nuestro endpoint', async (_section, pestana, id, ruta) => {
      responder(204);
      render(<ProfileRecordsManager initialRecords={PROFILE_RECORDS_MOCK} />);
      fireEvent.click(screen.getByRole('tab', { name: pestana }));
      const total = getDesktopRows().length;
      fireEvent.click(within(getDesktopRows()[0]).getByRole('button', { name: 'Eliminar registro' }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

      expect(await screen.findByRole('status')).toHaveTextContent('Registro eliminado');
      expect(getDesktopRows()).toHaveLength(total - 1);
      // CA-06: se borra con el endpoint del perfil, sin llamar al motor de afinidad
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toMatch(new RegExp(`/api/v1/perfil/${ruta}/${id}$`));
    });

    it('no muestra el aviso si la eliminación falla', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      render(<ProfileRecordsManager initialRecords={PROFILE_RECORDS_MOCK} />);
      fireEvent.click(within(getDesktopRows()[0]).getByRole('button', { name: 'Eliminar registro' }));
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

      expect(await screen.findByText('No se pudo eliminar el registro')).toBeInTheDocument();
      expect(screen.queryByText('Registro eliminado')).not.toBeInTheDocument();
    });

    it('BUG-HU8-02: registra cambios pendientes para el radar al eliminar un registro de educación o experiencia', async () => {
      clearPendingProfileChanges();
      responder(204);
      render(<ProfileRecordsManager initialRecords={PROFILE_RECORDS_MOCK} />);

      expect(hasPendingProfileChanges()).toBe(false);

      fireEvent.click(within(getDesktopRows()[0]).getByRole('button', { name: 'Eliminar registro' }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

      expect(await screen.findByRole('status')).toHaveTextContent('Registro eliminado');
      expect(hasPendingProfileChanges()).toBe(true);
      clearPendingProfileChanges();
    });
  });
});

describe('pestaña Proyectos (HU-19, T19.4)', () => {
  function abrirProyectos(proyectos = PROFILE_PROJECTS_MOCK) {
    render(<ProfileRecordsManager initialRecords={PROFILE_RECORDS_MOCK} initialProjects={proyectos} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Proyectos' }));
  }

  function getRows() {
    return within(screen.getByRole('table')).getAllByRole('row').slice(1);
  }

  it('lista los proyectos del más reciente al más antiguo con su enlace', () => {
    abrirProyectos();

    const rows = getRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Portafolio personal')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Sistema de inventario')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('link', { name: 'https://carlos-mendoza.dev' })).toHaveAttribute(
      'href',
      'https://carlos-mendoza.dev',
    );
  });

  it('muestra el estado vacío sin proyectos', () => {
    abrirProyectos([]);

    expect(screen.getByText('Aún no tienes proyectos guardados.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('abre la pestaña Proyectos desde la URL', () => {
    render(
      <ProfileRecordsManager
        initialRecords={PROFILE_RECORDS_MOCK}
        initialProjects={PROFILE_PROJECTS_MOCK}
        initialSection="projects"
      />,
    );

    expect(screen.getByRole('tab', { name: 'Proyectos' })).toHaveAttribute('aria-selected', 'true');
    expect(getRows()).toHaveLength(2);
  });

  it('edita un proyecto y muestra "Proyecto actualizado"', () => {
    abrirProyectos();
    fireEvent.click(within(getRows()[1]).getByRole('button', { name: 'Editar proyecto' }));

    const form = screen.getByRole('form', { name: 'Editar proyecto' });
    fireEvent.change(within(form).getByLabelText('Nombre del proyecto'), { target: { value: 'Inventario v2' } });
    fireEvent.change(within(form).getByLabelText('Descripción corta (opcional)'), { target: { value: '' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.queryByRole('form', { name: 'Editar proyecto' })).not.toBeInTheDocument();
    expect(within(getRows()[1]).getByText('Inventario v2')).toBeInTheDocument();
    expect(screen.queryByText('Aplicación web para el control de stock de una ferretería.')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Proyecto actualizado');
  });

  it('no guarda un enlace que no es https válido y muestra el error junto al campo', () => {
    abrirProyectos();
    fireEvent.click(within(getRows()[0]).getByRole('button', { name: 'Editar proyecto' }));

    const form = screen.getByRole('form', { name: 'Editar proyecto' });
    const enlace = within(form).getByLabelText('Enlace');
    fireEvent.change(enlace, { target: { value: 'http://carlos-mendoza.dev' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar cambios' }));

    expect(within(form).getByRole('alert')).toHaveTextContent('Ingresa una dirección https válida');
    expect(enlace).toHaveAttribute('aria-invalid', 'true');

    fireEvent.click(within(form).getByRole('button', { name: 'Cancelar' }));
    expect(within(getRows()[0]).getByText('https://carlos-mendoza.dev')).toBeInTheDocument();
  });

  it('pide confirmación antes de eliminar y "Cancelar" no borra nada', () => {
    abrirProyectos();
    fireEvent.click(within(getRows()[0]).getByRole('button', { name: 'Eliminar proyecto' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('¿Estás seguro de que deseas eliminar este registro?')).toBeInTheDocument();
    expect(within(dialog).getByText('Proyectos y portafolio')).toBeInTheDocument();
    expect(within(dialog).getByText('Portafolio personal')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getRows()).toHaveLength(2);
  });

  it('al confirmar quita solo ese proyecto y muestra "Proyecto eliminado"', () => {
    abrirProyectos();
    fireEvent.click(within(getRows()[0]).getByRole('button', { name: 'Eliminar proyecto' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getRows()).toHaveLength(1);
    expect(screen.queryByText('Portafolio personal')).not.toBeInTheDocument();
    expect(screen.getAllByText('Sistema de inventario').length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent('Proyecto eliminado');
  });

  it('usa los proyectos del estado compartido del perfil', () => {
    render(
      <ProfileStoreProvider initialRecords={PROFILE_RECORDS_MOCK} initialProjects={PROFILE_PROJECTS_MOCK}>
        <ProfileRecordsManager />
      </ProfileStoreProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Proyectos' }));
    fireEvent.click(within(getRows()[1]).getByRole('button', { name: 'Eliminar proyecto' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

    expect(getRows()).toHaveLength(1);
    expect(screen.queryByText('Sistema de inventario')).not.toBeInTheDocument();
  });
});
