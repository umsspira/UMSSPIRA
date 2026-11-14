'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  CertificateTemplateError,
  confirmCertificateTemplate,
  getCertificateTemplate,
  openCertificateTemplateFile,
  uploadCertificateTemplate,
  type CertificateTemplateDto,
  type CertificateTemplateStatus,
} from './certificate-template-service';
import './certificate-template.css';

type View =
  | 'home'
  | 'config'
  | 'loaded'
  | 'preview'
  | 'saved'
  | 'replace'
  | 'viewSaved'
  | 'invalidFile'
  | 'incomplete'
  | 'saveError';

const STATUS_LABEL: Record<CertificateTemplateStatus, string> = {
  NO_CONFIGURADO: 'No configurado',
  EN_CONFIGURACION: 'En configuración',
  HABILITADO: 'Habilitado',
};

const FIELD_LABEL = { EVENT_NAME: 'Nombre del evento', EVENT_DATE: 'Fecha del evento' } as const;

function shortDate(iso: string | null) {
  if (!iso) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(iso))
    .replaceAll('.', '')
    .replaceAll(' de ', ' ');
}

function longDate(iso: string | null) {
  if (!iso) return 'Sin asignar';
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  );
}

function isAccessError(error: unknown) {
  return error instanceof CertificateTemplateError && [403, 404].includes(error.status);
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="events-page ct-page">
      <header className="hu8-heading">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </header>
      {children}
    </main>
  );
}

export function CertificateTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<CertificateTemplateDto | null>(null);
  const [view, setView] = useState<View>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [wasReplacement, setWasReplacement] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    getCertificateTemplate(id)
      .then((result) => {
        if (!active) return;
        setData(result);
        setView(
          result.pendingTemplate ? (result.activeTemplate ? 'replace' : 'loaded') : 'home',
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (isAccessError(error)) setDenied(true);
        else setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la información.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const pickFile = () => fileInput.current?.click();

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !data) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setProblem('El formato no está admitido. Adjunta un archivo PDF.');
      setView('invalidFile');
      return;
    }
    if (file.size === 0) {
      setProblem('El archivo está vacío.');
      setView('invalidFile');
      return;
    }
    if (file.size > data.maxFileBytes) {
      setProblem('El archivo supera el límite de 5 MB.');
      setView('invalidFile');
      return;
    }
    setIsBusy(true);
    try {
      const next = await uploadCertificateTemplate(id, file);
      setData(next);
      setView(next.activeTemplate ? 'replace' : 'loaded');
    } catch (error) {
      if (isAccessError(error)) {
        setDenied(true);
      } else {
        setProblem(error instanceof Error ? error.message : 'No se pudo cargar la plantilla.');
        setView('invalidFile');
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function save() {
    if (!data) return;
    const replacing = Boolean(data.activeTemplate);
    setIsBusy(true);
    try {
      const next = await confirmCertificateTemplate(id);
      setData(next);
      setWasReplacement(replacing);
      setView('saved');
    } catch (error) {
      if (isAccessError(error)) setDenied(true);
      else if (error instanceof CertificateTemplateError && error.code === 'CERTIFICATE_FIELDS_INCOMPLETE') {
        setView('incomplete');
      } else setView('saveError');
    } finally {
      setIsBusy(false);
    }
  }

  async function openFile(version: 'active' | 'pending') {
    try {
      await openCertificateTemplateFile(id, version);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'No se pudo abrir el archivo.');
    }
  }

  if (denied) {
    return (
      <Shell title="Acceso restringido" subtitle="La configuración de certificados requiere autorización del Administrador.">
        <section className="ct-card is-error">
          <span className="ct-chip is-error">Sin permisos</span>
          <h2>No puedes modificar los certificados de este evento</h2>
          <p>Verifica que tu cuenta tenga permisos de administración sobre el evento seleccionado.</p>
          <div><Link href="/events" className="event-button event-button-secondary">Volver a Gestión</Link></div>
        </section>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell title="Certificados del evento" subtitle="Cargando la configuración…">
        <p role="status">Cargando…</p>
      </Shell>
    );
  }

  if (loadError || !data) {
    return (
      <Shell title="Certificados del evento" subtitle="No se pudo cargar la información.">
        <section className="ct-card is-error">
          <p role="alert">{loadError ?? 'No se pudo cargar la información.'}</p>
          <div><button type="button" className="event-button event-button-primary" onClick={() => setReloadKey((n) => n + 1)}>Reintentar</button></div>
        </section>
      </Shell>
    );
  }

  const { event, activeTemplate, pendingTemplate, missingFields } = data;
  const title = event.title?.trim() || 'Evento sin nombre';
  const place = event.location?.trim() || 'Ubicación no especificada';
  const subtitleEvent = `${title} · Configuración por evento`;
  const status: CertificateTemplateStatus = data.status;

  const eventCard = (
    <section className="ct-event" aria-label="Evento">
      <div>
        <strong>{title}</strong>
        <small>{shortDate(event.startDate)} · {place}</small>
      </div>
      <span className={`ct-chip ${status === 'HABILITADO' ? 'is-ok' : ''}`}>{STATUS_LABEL[status]}</span>
    </section>
  );

  const hiddenInput = (
    <input
      ref={fileInput}
      type="file"
      accept="application/pdf,.pdf"
      className="ct-hidden-input"
      data-testid="certificate-file-input"
      onChange={(e) => void onFileChosen(e)}
    />
  );

  const sample = (
    <article className="ct-certificate" aria-label="Ejemplo de certificado">
      <h3>CERTIFICADO DE PARTICIPACIÓN</h3>
      <small>Se deja constancia de la participación de:</small>
      <span className="ct-name">NOMBRE DEL TITULADO</span>
      <small>en el evento</small>
      <strong>{title}</strong>
      <small>{longDate(event.startDate)}</small>
    </article>
  );

  switch (view) {
    case 'home':
      return (
        <Shell title="Certificados del evento" subtitle="Gestiona la emisión de certificados para cada actividad universitaria.">
          {eventCard}
          {hiddenInput}
          <div className="ct-grid">
            <section className="ct-card">
              <h2>Certificados de participación</h2>
              <p>
                Puedes ofrecer certificados en los eventos que lo necesiten. Para comenzar,
                selecciona una plantilla y revisa cómo aparecerán los datos de los participantes.
              </p>
              <strong>Plantilla actual</strong>
              <span className={`ct-chip ${activeTemplate ? 'is-ok' : ''}`}>
                {activeTemplate ? activeTemplate.fileName : 'Ninguna'}
              </span>
              <div className="ct-actions">
                <Link href="/events" className="event-button event-button-secondary">Volver a Gestión</Link>
                {activeTemplate ? (
                  <>
                    <button type="button" className="event-button event-button-secondary" onClick={() => setView('viewSaved')}>Ver plantilla</button>
                    <button type="button" className="event-button event-button-primary" onClick={() => setView('replace')}>Reemplazar plantilla</button>
                  </>
                ) : (
                  <button type="button" className="event-button event-button-primary" onClick={() => setView('config')}>Habilitar y configurar certificados</button>
                )}
              </div>
            </section>
            <aside className="ct-card">
              <h2>¿Cómo funciona?</h2>
              <ol>
                <li>Selecciona la plantilla del evento.</li>
                <li>Revisa el nombre, evento y fecha.</li>
                <li>Guarda la configuración.</li>
                <li>Al finalizar el evento, se emitirán los certificados de quienes registraron asistencia.</li>
              </ol>
            </aside>
          </div>
        </Shell>
      );

    case 'config':
      return (
        <Shell title="Configurar certificados" subtitle={subtitleEvent}>
          {eventCard}
          {hiddenInput}
          <section className="ct-card is-accent">
            <span className="ct-note">ARCHIVO DE PLANTILLA</span>
            <h2>Carga un modelo de certificado para este evento</h2>
            <p>Selecciona el archivo PDF (máximo 5 MB) que utilizarás como modelo de certificado.</p>
            <div className="ct-actions">
              <button type="button" className="event-button event-button-primary" disabled={isBusy} onClick={pickFile}>
                {isBusy ? 'Cargando…' : 'Seleccionar archivo'}
              </button>
            </div>
          </section>
          <section className="ct-card">
            <h2>Emisión de certificados</h2>
            <span className="ct-chip">Deshabilitado</span>
            <p>
              Para habilitar la emisión, carga y guarda una plantilla válida. Si este evento no
              necesita certificados, déjalo sin plantilla: el evento podrá gestionarse normalmente
              y no se generarán certificados.
            </p>
            <div><Link href="/events" className="event-button event-button-secondary">Volver a Gestión</Link></div>
          </section>
        </Shell>
      );

    case 'loaded':
      return (
        <Shell title="Configurar certificado" subtitle="Comprueba qué datos aparecerán en el certificado.">
          {eventCard}
          {hiddenInput}
          <div className="ct-grid">
            <section className="ct-card is-accent">
              <span className="ct-chip is-ok">Archivo cargado</span>
              <h2>Plantilla del evento</h2>
              <p>{pendingTemplate?.fileName}</p>
              <p>Los campos se completarán con los datos guardados en UMSSPIRA.</p>
              <div><button type="button" className="event-button event-button-secondary" disabled={isBusy} onClick={pickFile}>Cambiar archivo</button></div>
            </section>
            <section className="ct-card">
              <h2>Datos del certificado</h2>
              <div className="ct-field"><label>Nombre del Titulado</label><output>Nombre de cada participante (se completara al emitir)</output></div>
              <div className="ct-field"><label>Nombre del evento</label>
                <output className={missingFields.includes('EVENT_NAME') ? 'is-missing' : ''}>
                  {missingFields.includes('EVENT_NAME') ? 'Sin asignar' : 'Se tomará de los datos del evento'}
                </output></div>
              <div className="ct-field"><label>Fecha del evento</label>
                <output className={missingFields.includes('EVENT_DATE') ? 'is-missing' : ''}>
                  {missingFields.includes('EVENT_DATE') ? 'Sin asignar' : 'Se tomará de la fecha del evento'}
                </output></div>
              <p className="ct-note">Los tres datos son obligatorios para emitir certificados.</p>
            </section>
          </div>
          <div className="ct-actions">
            <button type="button" className="event-button event-button-secondary" onClick={() => setView('preview')}>Ver vista previa</button>
            <button type="button" className="event-button event-button-primary" disabled={isBusy} onClick={() => void save()}>
              {isBusy ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </Shell>
      );

    case 'preview':
    case 'viewSaved': {
      const saved = view === 'viewSaved';
      const file = saved ? activeTemplate : pendingTemplate;
      return (
        <Shell
          title={saved ? 'Plantilla de certificado guardada' : 'Vista previa del certificado'}
          subtitle={saved ? 'Vista del modelo guardado. Los nombres son datos de ejemplo.' : 'Ejemplo con datos ilustrativos; no corresponde a una emisión real.'}
        >
          <div className="ct-grid">
            <aside className="ct-card">
              <h2>Revisión del modelo</h2>
              <p>Evento: {title}</p>
              <p>Datos del certificado: {missingFields.length ? 'incompletos' : 'completos'}</p>
              {file ? <p>Plantilla: {file.fileName}</p> : null}
              {!saved ? <p>Estado: {missingFields.length ? 'faltan datos' : 'listo para guardar'}</p> : null}
              <span className="ct-chip is-ok">Vista previa</span>
              <p>
                {saved
                  ? 'La emisión requiere que el evento haya finalizado y exista asistencia registrada.'
                  : 'Los certificados reales se emitirán cuando el evento finalice y exista asistencia registrada.'}
              </p>
              <div><button type="button" className="event-button event-button-secondary" onClick={() => void openFile(saved ? 'active' : 'pending')}>Abrir archivo PDF</button></div>
              {problem ? <p className="ct-feedback" role="alert">{problem}</p> : null}
            </aside>
            {sample}
          </div>
          <div className="ct-actions">
            {saved ? (
              <button type="button" className="event-button event-button-secondary" onClick={() => setView('home')}>Volver a certificados</button>
            ) : (
              <>
                <button type="button" className="event-button event-button-secondary" onClick={() => setView(activeTemplate ? 'replace' : 'loaded')}>Volver</button>
                <button type="button" className="event-button event-button-primary" disabled={isBusy} onClick={() => void save()}>
                  {isBusy ? 'Guardando…' : 'Confirmar configuración'}
                </button>
              </>
            )}
          </div>
        </Shell>
      );
    }

    case 'replace':
      return (
        <Shell title="Reemplazar plantilla" subtitle="Los certificados ya emitidos conservarán su archivo original.">
          {eventCard}
          {hiddenInput}
          <div className="ct-grid">
            <section className="ct-card">
              <h2>Plantilla actual</h2>
              <p>{activeTemplate?.fileName}</p>
              <span className="ct-chip is-ok">En uso</span>
              <p>
                {pendingTemplate
                  ? 'La nueva plantilla se aplicará después de guardar los cambios.'
                  : 'La plantilla actual seguirá activa hasta guardar correctamente una nueva.'}
              </p>
            </section>
            <section className="ct-card">
              <h2>Nuevo archivo</h2>
              <p>{pendingTemplate ? pendingTemplate.fileName : 'Aún no seleccionaste un archivo.'}</p>
              <div className="ct-actions">
                <button type="button" className="event-button event-button-secondary" disabled={isBusy} onClick={pickFile}>
                  {pendingTemplate ? 'Cambiar archivo' : 'Seleccionar nuevo archivo'}
                </button>
                {pendingTemplate ? (
                  <>
                    <button type="button" className="event-button event-button-secondary" onClick={() => setView('preview')}>Ver vista previa</button>
                    <button type="button" className="event-button event-button-primary" disabled={isBusy} onClick={() => void save()}>
                      {isBusy ? 'Guardando…' : 'Guardar nueva plantilla'}
                    </button>
                  </>
                ) : null}
              </div>
            </section>
          </div>
          <div><button type="button" className="event-button event-button-secondary" onClick={() => setView('home')}>Volver sin guardar</button></div>
        </Shell>
      );

    case 'saved':
      return (
        <Shell
          title={wasReplacement ? 'Plantilla actualizada' : 'Certificados habilitados'}
          subtitle={wasReplacement ? 'El nuevo modelo se guardó. Los certificados ya emitidos conservan su archivo.' : 'La configuración se guardó correctamente.'}
        >
          {eventCard}
          <div className="ct-grid">
            <section className="ct-card is-accent">
              <span className="ct-chip is-ok">Configuración guardada</span>
              <h2>Modelo listo para emitir</h2>
              <p>Plantilla: {activeTemplate?.fileName}</p>
              <p>Campos: nombre, evento y fecha</p>
              <p>Se aplicará a las próximas emisiones de este evento.</p>
              <div className="ct-actions">
                <button type="button" className="event-button event-button-secondary" onClick={() => setView('viewSaved')}>Ver plantilla</button>
                <Link href="/events" className="event-button event-button-primary">Volver a gestión</Link>
              </div>
            </section>
            <aside className="ct-card">
              <h2>Siguiente paso</h2>
              <p>Las próximas emisiones usarán esta plantilla cuando corresponda. Los certificados anteriores no cambiarán.</p>
            </aside>
          </div>
        </Shell>
      );

    case 'invalidFile':
      return (
        <Shell title="No se pudo cargar la plantilla" subtitle="El archivo seleccionado no cumple las condiciones de carga.">
          {eventCard}
          {hiddenInput}
          <section className="ct-card is-error">
            <span className="ct-chip is-error">Archivo rechazado</span>
            <h2>Revisa el archivo seleccionado</h2>
            <p role="alert">{problem ?? 'El archivo está vacío, dañado, supera el límite o no tiene un formato admitido.'}</p>
            {activeTemplate ? (
              <p>La plantilla válida anterior continúa habilitada; no se modificaron su configuración ni los certificados ya emitidos.</p>
            ) : null}
            <div><button type="button" className="event-button event-button-primary" onClick={pickFile}>Seleccionar otro archivo</button></div>
          </section>
        </Shell>
      );

    case 'incomplete':
      return (
        <Shell title="Faltan campos de la plantilla" subtitle="Revisa los datos del certificado antes de guardar.">
          {eventCard}
          <section className="ct-card is-error">
            <span className="ct-chip is-error">Configuración incompleta</span>
            <h2>Campos obligatorios pendientes</h2>
            <p>El modelo debe identificar nombre del Titulado, nombre del evento y fecha del evento. Corrige el campo marcado antes de activar certificados.</p>
            {missingFields.map((field) => (
              <div className="ct-field" key={field}>
                <label>{FIELD_LABEL[field]}</label>
                <output className="is-missing">Sin asignar</output>
              </div>
            ))}
            <div><button type="button" className="event-button event-button-primary" onClick={() => router.push(`/events/${id}/edit`)}>Corregir configuración</button></div>
          </section>
        </Shell>
      );

    case 'saveError':
      return (
        <Shell title="No se guardó la configuración" subtitle="No se pudieron guardar los cambios.">
          {eventCard}
          <section className="ct-card is-error">
            <span className="ct-chip is-error">No se pudo guardar</span>
            <h2>Tu configuración anterior sigue disponible</h2>
            <p>Intenta nuevamente. Ningún certificado ha sido generado por esta operación fallida.</p>
            <div><button type="button" className="event-button event-button-primary" disabled={isBusy} onClick={() => void save()}>Reintentar guardado</button></div>
          </section>
        </Shell>
      );
  }
}
