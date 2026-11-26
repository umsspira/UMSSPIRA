import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { OcrAnalysis } from '@umsspira/shared-types';
import { ApplicationDetail, type Application } from './application-detail';
import { ocrRequest } from '../services/ocr-api';
import { HistoryTab } from './history-tab';
import { fetchApplicationHistory, type ApplicationHistory } from '../services/applications-board.service';

jest.mock('../services/applications-board.service', () => ({ fetchApplicationHistory: jest.fn() }));
jest.mock('../services/ocr-api', () => ({ ocrRequest: jest.fn() }));
const fetchHistory = fetchApplicationHistory as jest.Mock;
const at = '2026-10-07T14:45:00.000Z';
const empty = (id = 'app-1'): ApplicationHistory => ({
  applicationId: id, currentVersion: 1, eventCount: 0, events: [],
  ocr: { latestAnalysis: null, latestResult: null },
});
const populated = (): ApplicationHistory => ({
  ...empty(), currentVersion: 2, eventCount: 1,
  events: [{ id: 'send', version: 2, action: 'REENVIO', title: 'Reenvío',
    description: 'Corrección entregada', actor: { type: 'TITULADO', id: null }, occurredAt: at }],
  ocr: {
    latestAnalysis: { id: 'ocr-2', version: 2, status: 'EN_CURSO', startedAt: at, completedAt: null, error: null },
    latestResult: { id: 'ocr-1', version: 1, isCurrent: false, analyzedAt: at,
      suggestion: 'OBSERVAR', reason: 'Diferencias en el documento', rulesVersion: '1', comparedData: [] },
  },
});

describe('HistoryTab integrado en el expediente', () => {
  beforeEach(() => { jest.resetAllMocks(); jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('carga automáticamente sin duplicar la tarjeta OCR y no ofrece expansión para un único evento', async () => {
    fetchHistory.mockResolvedValue({ ok: true, data: populated() });
    render(<HistoryTab applicationId="app-1" />);
    expect(await screen.findByText('Corrección entregada')).toBeVisible();
    expect(fetchHistory).toHaveBeenCalledWith('app-1');
    expect(screen.getByText('1 movimiento registrado')).toBeVisible();
    expect(screen.queryByText('Resultado automático más reciente')).not.toBeInTheDocument();
    expect(screen.queryByText('Sugerencia: observar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('actualiza los eventos cuando termina el OCR sin añadir una tarjeta de resultado', async () => {
    const data = populated();
    fetchHistory.mockResolvedValueOnce({ ok: true, data });
    render(<HistoryTab applicationId="app-1" />);
    await screen.findByText('Corrección entregada');
    const completed = { ...data, eventCount: 2, ocr: {
      latestAnalysis: { ...data.ocr.latestAnalysis!, status: 'COMPLETADO', completedAt: at },
      latestResult: { ...data.ocr.latestResult!, version: 2, isCurrent: true, suggestion: 'APROBAR' },
    }, events: [{ ...data.events[0], id: 'ocr-2', action: 'OCR_ANALISIS', description: 'OCR sugirió aprobar' }, ...data.events] };
    fetchHistory.mockResolvedValue({ ok: true, data: completed });
    await act(async () => { window.dispatchEvent(new Event('umsspira:ocr-updated')); });
    expect(await screen.findByText('OCR sugirió aprobar')).toBeVisible();
    expect(screen.getByText('2 movimientos registrados')).toBeVisible();
    expect(screen.queryByText('Corrección entregada')).not.toBeInTheDocument();
    expect(screen.queryByText('Resultado automático más reciente')).not.toBeInTheDocument();
  });

  const multiple = (id = 'app-1'): ApplicationHistory => ({
    ...populated(), applicationId: id, eventCount: 3,
    events: [...populated().events,
      { id: 'ocr-1', version: 1, action: 'OCR_ANALISIS', title: 'OCR', description: 'OCR sugirió observar',
        actor: { type: 'SISTEMA', id: null }, occurredAt: '2026-10-06T14:20:00Z' },
      { id: 'send-1', version: 1, action: 'ENVIO', title: 'Envío', description: 'Envío inicial registrado',
        actor: { type: 'TITULADO', id: null }, occurredAt: '2026-10-05T12:30:00Z' },
    ],
  });

  it('contrae por defecto, despliega en orden y vuelve al último evento sin consultar la API', async () => {
    const data = multiple();
    fetchHistory.mockResolvedValue({ ok: true, data });
    render(<HistoryTab applicationId="app-1" />);
    const toggle = await screen.findByRole('button', { name: /Historial de la solicitud/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toContainElement(screen.getByRole('list'));
    expect(screen.getByText('3 movimientos registrados')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Corrección entregada')).toBeVisible();
    expect(screen.getByText('Versión 2 · Titulado')).toBeVisible();
    expect(screen.getByRole('time')).toHaveAttribute('datetime', at);
    expect(screen.getByRole('time')).toHaveTextContent(new Date(at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }));
    toggle.focus();
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('type', 'button');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getAllByRole('time').map(node => node.getAttribute('datetime')))
      .toEqual(data.events.map(event => event.occurredAt));
    expect(screen.getByText('OCR sugirió observar')).toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Corrección entregada')).toBeVisible();
    expect(fetchHistory).toHaveBeenCalledTimes(1);
  });

  it('restablece la vista contraída al cambiar de expediente después de expandir', async () => {
    fetchHistory.mockResolvedValueOnce({ ok: true, data: multiple() })
      .mockResolvedValueOnce({ ok: true, data: { ...multiple('app-2'), events: multiple('app-2').events.map(event => ({
        ...event, description: `Otro expediente: ${event.description}`,
      })) } });
    const { rerender } = render(<HistoryTab applicationId="app-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Historial de la solicitud/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    rerender(<HistoryTab applicationId="app-2" />);
    expect(screen.queryByText('Corrección entregada')).not.toBeInTheDocument();
    expect(await screen.findByText('Otro expediente: Corrección entregada')).toBeVisible();
    expect(screen.getByRole('button', { name: /Historial de la solicitud/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('no mezcla datos ni acepta respuestas tardías de otro expediente', async () => {
    let resolveFirst!: (value: unknown) => void;
    fetchHistory.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ ok: true, data: empty('app-2') });
    const { rerender } = render(<HistoryTab applicationId="app-1" />);
    rerender(<HistoryTab applicationId="app-2" />);
    await screen.findByText(/Aún no hay acciones/);
    await act(async () => resolveFirst({ ok: true, data: populated() }));
    expect(screen.queryByText('Corrección entregada')).not.toBeInTheDocument();
    expect(screen.queryByText('Sugerencia: observar')).not.toBeInTheDocument();
    expect(screen.getByText(/Aún no hay acciones/)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('limpia resultados ya cargados al seleccionar otro expediente', async () => {
    fetchHistory.mockResolvedValueOnce({ ok: true, data: populated() })
      .mockReturnValueOnce(new Promise(() => {}));
    const { rerender } = render(<HistoryTab applicationId="app-1" />);
    await screen.findByText('Corrección entregada');
    rerender(<HistoryTab applicationId="app-2" />);
    expect(screen.queryByText('Corrección entregada')).not.toBeInTheDocument();
    expect(screen.queryByText('Sugerencia: observar')).not.toBeInTheDocument();
    expect(screen.getByText('Cargando la línea de tiempo…')).toBeVisible();
  });

  it.each([0, 401, 403, 500])('distingue error %i de historial vacío', async status => {
    fetchHistory.mockResolvedValue({ ok: false, status, message: 'No se pudo consultar el historial' });
    render(<HistoryTab applicationId="app-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar el historial');
    expect(screen.queryByText(/Aún no hay acciones/)).not.toBeInTheDocument();
  });

  it('maneja una excepción de comunicación', async () => {
    fetchHistory.mockRejectedValue(new Error('Sin conexión'));
    render(<HistoryTab applicationId="app-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  });

  it.each(['PENDIENTE', 'FALLIDO', 'DESCARTADO'])('conserva el historial vacío con OCR %s sin duplicar su estado', async status => {
    const data = empty();
    data.ocr.latestAnalysis = { id: 'ocr-1', version: 1, status, startedAt: at, completedAt: null,
      error: status === 'FALLIDO' ? 'No se pudo leer el documento' : null };
    fetchHistory.mockResolvedValue({ ok: true, data });
    render(<HistoryTab applicationId="app-1" />);
    expect(await screen.findByText(/Aún no hay acciones/)).toBeVisible();
    expect(screen.queryByText('Sugerencia: observar')).not.toBeInTheDocument();
    expect(screen.getByText(/Aún no hay acciones/)).toBeVisible();
    expect(screen.queryByText('Resultado automático más reciente')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  const completed: OcrAnalysis = {
    id: 'ocr-1', revision: 1, current: true, status: 'COMPLETADO', createdAt: at, completedAt: at, error: null,
    result: { suggestion: 'OBSERVAR', reason: 'Diferencias en el documento', rulesVersion: '1',
      findings: [{ field: 'ci', label: 'CI', declared: '123456', read: '123457', evidence: null,
        status: 'POSIBLE_DIFERENCIA', reason: 'Números diferentes' }],
      reading: { lines: [], pagesRead: 1, totalPages: 1, partial: false, engine: 'test', loadMs: 1, readMs: 1 },
    },
  };
  const application: Application = {
    id: 'app-1', code: 'TIT-1', status: 'PENDIENTE', firstName: 'Ana', lastName: 'Pérez', ci: '123456',
    segipValidated: false, institutionalEmail: 'ana@example.com', phone: '77777777', sisCode: '123',
    career: 'Sistemas', graduationYear: '2023', submittedAt: at, procedureType: 'Respaldo', procedureMode: 'Original',
    documentName: 'titulo.pdf', documentUrl: '/document.pdf', checklist: [],
  };

  it('muestra la comparación OCR y conserva la sugerencia, el motivo, la fecha y la versión en los detalles', async () => {
    fetchHistory.mockResolvedValue({ ok: true, data: populated() });
    jest.mocked(ocrRequest).mockResolvedValue([completed]);
    render(<ApplicationDetail application={application} history={<HistoryTab applicationId="app-1" />} />);
    expect(await screen.findByText('Revisar hallazgos')).toBeVisible();
    const panel = screen.getByText('Análisis automático del respaldo (OCR)').closest('details')!;
    expect(within(panel).getByText('Sugerencia: observar')).not.toBeVisible();
    fireEvent.click(within(panel).getByText('Detalles del análisis'));
    expect(within(panel).getByText('Sugerencia: observar')).toBeVisible();
    expect(within(panel).getByText('Diferencias en el documento')).toBeVisible();
    expect(within(panel).getByText(/Versión 1/)).toHaveTextContent(new Date(at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }));
    expect(within(panel).getByRole('table')).toHaveTextContent('123456');
    expect(within(panel).getByRole('table')).toHaveTextContent('123457');
    const history = screen.getByRole('region', { name: /Historial de la solicitud/ });
    expect(within(history).queryByText('Resultado automático más reciente')).not.toBeInTheDocument();
    expect(within(history).queryByText('Sugerencia: observar')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Documento adjunto: titulo.pdf').closest('section')?.nextElementSibling).toBe(history);
  });

  it.each(['PENDIENTE', 'EN_CURSO', 'FALLIDO'] as const)('identifica el resultado anterior en el panel OCR cuando el nuevo está %s', async status => {
    const data = populated();
    data.ocr.latestAnalysis!.status = status;
    fetchHistory.mockResolvedValue({ ok: true, data });
    jest.mocked(ocrRequest).mockResolvedValue([
      { ...completed, id: 'ocr-2', revision: 2, status, result: null, completedAt: null,
        error: status === 'FALLIDO' ? 'Error de lectura' : null },
      { ...completed, current: false },
    ]);
    render(<ApplicationDetail application={application} history={<HistoryTab applicationId="app-1" />} />);
    const previous = await screen.findByText('Análisis anteriores');
    fireEvent.click(previous);
    const antecedent = screen.getByText(/Antecedente · versión 1/);
    expect(antecedent).toHaveTextContent('Sugerencia: observar');
    expect(antecedent).toHaveTextContent(new Date(at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }));
    expect(antecedent.closest('details')?.open).toBe(true);
    expect(screen.queryByText('Resultado automático más reciente')).not.toBeInTheDocument();
    if (status === 'FALLIDO') expect(screen.getByText('Falló el procesamiento')).toBeVisible();
    else expect(screen.getByText(status === 'PENDIENTE' ? 'Pendiente' : 'En curso')).toBeVisible();
  });
});
