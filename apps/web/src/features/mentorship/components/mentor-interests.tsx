'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MentorState } from '@umsspira/shared-types';
import {
  CheckIcon,
  SaveIcon,
  Trash2Icon,
  Undo2Icon,
  LockKeyholeIcon,
  PlusIcon,
  XIcon,
  ServerIcon,
  MonitorIcon,
  DatabaseIcon,
  BadgeCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PencilIcon,
} from 'lucide-react';
import { ConfirmModal } from '@/shared/components/confirm-modal';
import { PrimaryButton, SecondaryButton } from './mentor-button';
import {
  normalizeInterests,
  normalizeTopicText,
  sameConfiguration,
  validateTopicInput,
  MAX_CUSTOM_TOPICS_PER_AREA,
  type InterestArea,
  type InterestConfiguration,
  type InterestTopic,
} from '../model/mentor-interests';
import {
  createCustomInterestApi,
  deleteCustomInterestApi,
  updateCustomInterestApi,
} from '../services/mentor-interests-api';

interface Props {
  catalog: InterestArea[];
  initialConfiguration: InterestConfiguration;
  onSave: (configuration: InterestConfiguration) => Promise<InterestConfiguration>;
  onCreateCustomTopic?: (
    areaId: string,
    text: string,
  ) => Promise<{ id: string; name: string; isCustom?: boolean; matchedSuggested?: boolean; message?: string }>;
  onUpdateCustomTopic?: (id: string, text: string) => Promise<{ id: string; name: string }>;
  onDeleteCustomTopic?: (id: string) => Promise<void>;
  areasHref?: string;
  onNavigate?: (href: string) => void;
  profile?: MentorState;
  minimumAreas?: number;
}

export function MentorInterests({
  catalog,
  initialConfiguration,
  onSave,
  onCreateCustomTopic,
  onUpdateCustomTopic,
  onDeleteCustomTopic,
  areasHref = '/mentorship/profile/areas',
  onNavigate,
  profile,
  minimumAreas = 0,
}: Props) {
  const router = useRouter();
  const [currentCatalog, setCurrentCatalog] = useState<InterestArea[]>(catalog);
  const [saved, setSaved] = useState(() => normalizeInterests(catalog, initialConfiguration));
  const [draft, setDraft] = useState(saved);
  const [dialog, setDialog] = useState<'save' | 'discard' | 'leave' | string | null>(null);
  const [destination, setDestination] = useState(areasHref);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Estados para intereses personalizados (HU 6.22)
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const [customFeedback, setCustomFeedback] = useState<Record<string, { message: string; type: 'success' | 'info' }>>({});
  const [deletingTopic, setDeletingTopic] = useState<InterestTopic | null>(null);
  const [editingTopic, setEditingTopic] = useState<{ id: string; areaId: string; name: string; error?: string } | null>(null);

  useEffect(() => {
    setCurrentCatalog(catalog);
  }, [catalog]);

  const dirty = !sameConfiguration(saved, draft);
  // HU 6.13: el enlace del checklist enfoca el primer tópico sugerido cuando aún no hay intereses.
  const firstSuggestedId = draft.topicIds.length
    ? undefined
    : currentCatalog
        .filter((area) => draft.areaIds.includes(area.id))
        .flatMap((area) => area.topics)
        .find((topic) => !topic.isCustom)?.id;
  const completedSteps = Number(saved.areaIds.length > 0) + Number(saved.topicIds.length > 0);
  const added = draft.topicIds.filter((id) => !saved.topicIds.includes(id));
  const removed = saved.topicIds.filter((id) => !draft.topicIds.includes(id));
  const topicName = (id: string) =>
    currentCatalog.flatMap((area) => area.topics).find((topic) => topic.id === id)?.name || id;
  const removingArea = currentCatalog.find((area) => dialog === `area:${area.id}`);
  const affectedTopics = removingArea?.topics.filter((topic) => draft.topicIds.includes(topic.id)) || [];
  const navigate = (href: string) => (onNavigate ? onNavigate(href) : router.push(href));

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);

  useEffect(() => {
    if (window.location.hash === '#first-incomplete' && !draft.topicIds.length) {
      document.getElementById('first-incomplete')?.focus();
    }
  }, [catalog, draft.topicIds.length]);

  function change(next: InterestConfiguration) {
    setDraft(normalizeInterests(currentCatalog, next));
    setSuccess(false);
    setError('');
  }

  function leave(href: string) {
    if (savingRef.current) return;
    if (!dirty) navigate(href);
    else {
      setDestination(href);
      setDialog('leave');
    }
  }

  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const confirmed = normalizeInterests(
        currentCatalog,
        await onSave({ areaIds: [...draft.areaIds], topicIds: [...draft.topicIds] }),
      );
      setSaved(confirmed);
      setDraft(confirmed);
      setSuccess(true);
      setStatusMessage('');
      setDialog(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron guardar los intereses. Vuelve a intentar.');
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }

  // CAF-01, CAF-02, CAF-04, CAF-05, CAF-06, CAF-07, CAF-08, CAF-11
  async function handleAddCustomTopic(areaId: string) {
    const rawText = customInputs[areaId] || '';
    const validationError = validateTopicInput(rawText);
    if (validationError) {
      setCustomErrors((prev) => ({ ...prev, [areaId]: validationError }));
      return;
    }
    const targetArea = currentCatalog.find((a) => a.id === areaId);
    if (!targetArea) return;

    // CAF-08: Límite de temas personalizados por área
    const currentCustomCount = targetArea.topics.filter(
      (t) => t.isCustom && draft.topicIds.includes(t.id),
    ).length;
    if (currentCustomCount >= MAX_CUSTOM_TOPICS_PER_AREA) {
      setCustomErrors((prev) => ({
        ...prev,
        [areaId]: `Alcanzaste el límite de ${MAX_CUSTOM_TOPICS_PER_AREA} temas personalizados en esta área.`,
      }));
      return;
    }

    // CAF-06: Duplicados en el área
    const norm = normalizeTopicText(rawText);
    const existingTopic = targetArea.topics.find((t) => normalizeTopicText(t.name) === norm);
    if (existingTopic && draft.topicIds.includes(existingTopic.id)) {
      setCustomErrors((prev) => ({ ...prev, [areaId]: 'Ya tienes este interés en el área' }));
      return;
    }

    // CAF-07: Coincidencia con sugerido del área
    const suggestedMatch = targetArea.topics.find((t) => !t.isCustom && normalizeTopicText(t.name) === norm);
    if (suggestedMatch) {
      if (!draft.topicIds.includes(suggestedMatch.id)) {
        change({ ...draft, topicIds: [...draft.topicIds, suggestedMatch.id] });
      }
      setCustomInputs((prev) => ({ ...prev, [areaId]: '' }));
      setCustomErrors((prev) => ({ ...prev, [areaId]: '' }));
      setCustomFeedback((prev) => ({
        ...prev,
        [areaId]: { message: 'Se seleccionó el interés sugerido existente', type: 'info' },
      }));
      return;
    }

    setSaving(true);
    setCustomErrors((prev) => ({ ...prev, [areaId]: '' }));
    try {
      if (onCreateCustomTopic) {
        const res = await onCreateCustomTopic(areaId, rawText.trim());
        if (res.matchedSuggested) {
          if (!draft.topicIds.includes(res.id)) {
            change({ ...draft, topicIds: [...draft.topicIds, res.id] });
          }
          setCustomFeedback((prev) => ({
            ...prev,
            [areaId]: { message: res.message || 'Se seleccionó el interés sugerido existente', type: 'info' },
          }));
        } else {
          const newTopic: InterestTopic = { id: res.id, name: res.name, isCustom: true };
          setCurrentCatalog((prev) =>
            prev.map((a) => (a.id === areaId ? { ...a, topics: [...a.topics, newTopic] } : a)),
          );
          setDraft((prev) => ({ ...prev, topicIds: [...prev.topicIds, newTopic.id] }));
          setSaved((prev) => ({ ...prev, topicIds: [...prev.topicIds, newTopic.id] }));
          setCustomFeedback((prev) => ({ ...prev, [areaId]: { message: 'Interés agregado', type: 'success' } }));
        }
      } else {
        const res = await createCustomInterestApi(areaId, rawText.trim());
        if (res.coincidencia_sugerido) {
          if (!draft.topicIds.includes(res.id)) {
            change({ ...draft, topicIds: [...draft.topicIds, res.id] });
          }
          setCustomFeedback((prev) => ({
            ...prev,
            [areaId]: { message: res.mensaje || 'Se seleccionó el interés sugerido existente', type: 'info' },
          }));
        } else {
          const newTopic: InterestTopic = {
            id: res.id,
            name: res.nombre,
            isCustom: true,
          };
          setCurrentCatalog((prev) =>
            prev.map((a) => (a.id === areaId ? { ...a, topics: [...a.topics, newTopic] } : a)),
          );
          setDraft((prev) => ({ ...prev, topicIds: [...prev.topicIds, newTopic.id] }));
          setSaved((prev) => ({ ...prev, topicIds: [...prev.topicIds, newTopic.id] }));
          setCustomFeedback((prev) => ({
            ...prev,
            [areaId]: { message: 'Interés agregado', type: 'success' },
          }));
        }
      }
      setCustomInputs((prev) => ({ ...prev, [areaId]: '' }));
    } catch (err) {
      setCustomErrors((prev) => ({
        ...prev,
        [areaId]: err instanceof Error ? err.message : 'No se pudo agregar el interés',
      }));
    } finally {
      setSaving(false);
    }
  }

  // CAF-09: Eliminar interés personalizado
  async function handleConfirmDelete() {
    if (!deletingTopic) return;
    setSaving(true);
    try {
      if (onDeleteCustomTopic) {
        await onDeleteCustomTopic(deletingTopic.id);
      } else {
        await deleteCustomInterestApi(deletingTopic.id);
      }
      setCurrentCatalog((prev) =>
        prev.map((a) => ({
          ...a,
          topics: a.topics.filter((t) => t.id !== deletingTopic.id),
        })),
      );
      setDraft((prev) => ({ ...prev, topicIds: prev.topicIds.filter((id) => id !== deletingTopic.id) }));
      setSaved((prev) => ({ ...prev, topicIds: prev.topicIds.filter((id) => id !== deletingTopic.id) }));
      setStatusMessage('Interés eliminado');
      setDeletingTopic(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el interés');
    } finally {
      setSaving(false);
    }
  }

  // CAF-10: Editar interés personalizado
  async function handleConfirmEdit() {
    if (!editingTopic) return;
    const validationError = validateTopicInput(editingTopic.name);
    if (validationError) {
      setEditingTopic((prev) => (prev ? { ...prev, error: validationError } : null));
      return;
    }
    const targetArea = currentCatalog.find((a) => a.id === editingTopic.areaId);
    const norm = normalizeTopicText(editingTopic.name);
    const hasDuplicate = targetArea?.topics.some(
      (t) => t.id !== editingTopic.id && normalizeTopicText(t.name) === norm,
    );
    if (hasDuplicate) {
      setEditingTopic((prev) => (prev ? { ...prev, error: 'Ya tienes este interés en el área' } : null));
      return;
    }

    setSaving(true);
    try {
      if (onUpdateCustomTopic) {
        const res = await onUpdateCustomTopic(editingTopic.id, editingTopic.name.trim());
        setCurrentCatalog((prev) =>
          prev.map((a) => ({
            ...a,
            topics: a.topics.map((t) => (t.id === editingTopic.id ? { ...t, name: res.name } : t)),
          })),
        );
      } else {
        const res = await updateCustomInterestApi(editingTopic.id, editingTopic.name.trim());
        setCurrentCatalog((prev) =>
          prev.map((a) => ({
            ...a,
            topics: a.topics.map((t) => (t.id === editingTopic.id ? { ...t, name: res.nombre } : t)),
          })),
        );
      }
      setEditingTopic(null);
      setStatusMessage('Interés actualizado');
    } catch (err) {
      setEditingTopic((prev) =>
        prev ? { ...prev, error: err instanceof Error ? err.message : 'No se pudo actualizar el interés' } : null,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="interests-editor">
      <section className="interests-summary" aria-label="Áreas técnicas guardadas">
        <div className="interests-summary-status">
          {profile && (
            <span className="interests-active-badge">
              <span />
              {profile.isActive ? 'Activo' : 'Inactivo'}
            </span>
          )}
          <span>Intereses asociados a tus áreas técnicas</span>
          <span className="interests-approved-badge">
            {profile?.requirements.egresado && (
              <>
                <BadgeCheckIcon size={16} aria-hidden="true" />
                Titulado aprobado ·{' '}
              </>
            )}
            {draft.areaIds.length} áreas seleccionadas
          </span>
        </div>
        <div className="interests-summary-body">
          <p>
            Tus áreas técnicas guardadas determinan el catálogo disponible de intereses para orientación individual y de
            equipo.
          </p>
          <SecondaryButton disabled={saving} onClick={() => leave(areasHref)}>
            Modificar áreas técnicas
            <ArrowRightIcon size={16} aria-hidden="true" />
          </SecondaryButton>
        </div>
      </section>

      <div className="interests-section-heading">
        <h2>Catálogo de tópicos por área</h2>
        <p>Toca un tópico para agregarlo o quitarlo de tu perfil, o agrega tus propios temas.</p>
      </div>

      {!currentCatalog.length && <p>No hay tópicos disponibles. Configura tus áreas técnicas para comenzar.</p>}

      {statusMessage && (
        <div role="status" className="interests-success">
          <span>
            <CheckIcon size={16} aria-hidden="true" />
          </span>
          <div>
            <strong>{statusMessage}</strong>
          </div>
        </div>
      )}

      <div className="interests-grid">
        {currentCatalog.map((area) => {
          const enabled = draft.areaIds.includes(area.id);
          const selected = area.topics.filter((topic) => draft.topicIds.includes(topic.id));
          const customCount = selected.filter((t) => t.isCustom).length;
          const isAtLimit = customCount >= MAX_CUSTOM_TOPICS_PER_AREA;
          const name = area.name.toLocaleLowerCase('es');
          const AreaIcon = name.includes('backend')
            ? ServerIcon
            : name.includes('frontend')
              ? MonitorIcon
              : DatabaseIcon;
          const areaFeedback = customFeedback[area.id];
          const areaError = customErrors[area.id];
          const currentInput = customInputs[area.id] || '';

          return (
            <section
              key={area.id}
              aria-labelledby={`area-${area.id}`}
              className={`interest-area${enabled ? '' : ' interest-area-locked'}`}
            >
              <div className="interest-area-header">
                <span className="interest-area-icon">
                  <AreaIcon size={20} aria-hidden="true" />
                </span>
                <div>
                  <div className="interest-area-heading">
                    <h3 id={`area-${area.id}`}>{area.name}</h3>
                    <span>
                      {enabled ? (
                        'Área activa'
                      ) : (
                        <>
                          <LockKeyholeIcon size={14} aria-hidden="true" /> Bloqueada
                        </>
                      )}
                    </span>
                  </div>
                  <p>{area.description}</p>
                </div>
              </div>

              {enabled && area.topics.length === 0 && (
                <p>Esta área todavía no tiene tópicos disponibles en el catálogo.</p>
              )}

              {enabled ? (
                <>
                  <h4>En tu perfil · {selected.length} tópicos</h4>
                  {selected.length === 0 && <p>Aún no seleccionaste intereses en esta área.</p>}
                  <div className="interest-topics">
                    {selected.map((topic) => (
                      <div key={topic.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          aria-pressed="true"
                          disabled={saving}
                          onClick={() =>
                            topic.isCustom
                              ? setDeletingTopic(topic)
                              : change({ ...draft, topicIds: draft.topicIds.filter((id) => id !== topic.id) })
                          }
                        >
                          {topic.name}
                          {topic.isCustom && <span className="interest-custom-badge">Personalizado</span>}
                          <XIcon size={14} aria-hidden="true" />
                        </button>
                        {topic.isCustom && (
                          <button
                            type="button"
                            title="Editar interés personalizado"
                            aria-label={`Editar ${topic.name}`}
                            className="custom-topic-action-btn"
                            disabled={saving}
                            onClick={() => setEditingTopic({ id: topic.id, areaId: area.id, name: topic.name })}
                          >
                            <PencilIcon size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <h4>Sugeridos</h4>
                  <div className="interest-topics">
                    {area.topics
                      .filter((topic) => !topic.isCustom && !draft.topicIds.includes(topic.id))
                      .map((topic) => (
                        <button
                          id={topic.id === firstSuggestedId ? 'first-incomplete' : undefined}
                          key={topic.id}
                          type="button"
                          aria-pressed="false"
                          disabled={saving}
                          onClick={() => change({ ...draft, topicIds: [...draft.topicIds, topic.id] })}
                        >
                          <PlusIcon size={14} aria-hidden="true" />
                          {topic.name}
                        </button>
                      ))}
                  </div>

                  {/* CAF-01: Campo para agregar otro tema */}
                  <div className="custom-topic-section">
                    <label htmlFor={`custom-topic-${area.id}`} className="custom-topic-label">
                      Agregar otro tema
                    </label>
                    <div className="custom-topic-row">
                      <input
                        id={`custom-topic-${area.id}`}
                        type="text"
                        className="custom-topic-input"
                        placeholder="Escribe un tema de interés..."
                        maxLength={50}
                        disabled={saving || isAtLimit}
                        value={currentInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomInputs((prev) => ({ ...prev, [area.id]: val }));
                          setCustomErrors((prev) => ({ ...prev, [area.id]: '' }));
                          setCustomFeedback((prev) => ({ ...prev, [area.id]: undefined as any }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleAddCustomTopic(area.id);
                          }
                        }}
                      />
                      <span className="custom-topic-counter">{currentInput.length}/50</span>
                      <button
                        type="button"
                        className="custom-topic-add-btn"
                        disabled={saving || isAtLimit || !currentInput.trim()}
                        onClick={() => void handleAddCustomTopic(area.id)}
                      >
                        Agregar
                      </button>
                    </div>

                    {/* CAF-08: Límite permitido */}
                    {isAtLimit && (
                      <p className="custom-topic-limit">
                        Alcanzaste el máximo de {MAX_CUSTOM_TOPICS_PER_AREA} temas personalizados en esta área.
                      </p>
                    )}

                    {/* Validaciones: vacío, longitud, duplicado, caracteres inválidos */}
                    {areaError && (
                      <p role="alert" className="custom-topic-error">
                        {areaError}
                      </p>
                    )}

                    {/* Feedback exitoso o sugerido */}
                    {areaFeedback && (
                      <p role="status" className="custom-topic-feedback">
                        {areaFeedback.message}
                      </p>
                    )}
                  </div>

                  <div className="interest-area-footer">
                    <span>
                      {selected.length} de {area.topics.length} seleccionados
                      {customCount > 0 && ` (${customCount} personalizado${customCount > 1 ? 's' : ''})`}
                    </span>
                    <button
                      type="button"
                      disabled={saving || draft.areaIds.length <= minimumAreas}
                      title={
                        draft.areaIds.length <= minimumAreas
                          ? 'Debes conservar al menos un área técnica.'
                          : undefined
                      }
                      onClick={() => setDialog(`area:${area.id}`)}
                    >
                      <Trash2Icon size={14} aria-hidden="true" />
                      Quitar área
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Área no incluida en tu selección técnica. Para seleccionar estos tópicos, primero debes agregar esta
                    área en Áreas técnicas.
                  </p>
                  <div className="interest-topics">
                    {area.topics.map((topic) => (
                      <button key={topic.id} type="button" disabled>
                        {topic.name}
                      </button>
                    ))}
                  </div>
                  <SecondaryButton disabled={saving} onClick={() => leave(areasHref)}>
                    Activar esta área técnica
                  </SecondaryButton>
                </>
              )}
            </section>
          );
        })}
      </div>

      <p className="interests-catalog-note">
        Solo se muestran tópicos de tus áreas técnicas.{' '}
        <button type="button" disabled={saving} onClick={() => leave(areasHref)}>
          Agregar otra área
        </button>
      </p>

      {/* #272: Indicador con el paso actual y los pasos completados */}
      <section className="interests-progress" aria-label="Configuración del perfil">
        <div className="interests-progress-heading">
          <h2>Completa tu perfil de mentor</h2>
          <span>
            <strong>{completedSteps}</strong> de 3 pasos completados
          </span>
        </div>
        <div className="interests-progress-track">
          <span style={{ width: `${(completedSteps / 3) * 100}%` }} />
        </div>
        <ol>
          <li>
            <span className="interests-step-number">
              <CheckIcon size={16} aria-hidden="true" />
            </span>
            <div>
              <small>Paso 1</small>
              <strong>Áreas técnicas</strong>
            </div>
          </li>
          <li aria-current="step">
            <span className="interests-step-label">En edición</span>
            <span className="interests-step-number">2</span>
            <div>
              <small>Paso actual</small>
              <strong>Intereses de mentoría</strong>
            </div>
          </li>
          <li>
            <span className="interests-step-number">3</span>
            <div>
              <small>Paso 3</small>
              <strong>Disponibilidad</strong>
            </div>
          </li>
        </ol>
      </section>

      {success && (
        <div role="status" className="interests-success">
          <span>
            <CheckIcon size={16} aria-hidden="true" />
          </span>
          <div>
            <strong>Intereses guardados correctamente</strong>
            <p>Guardaste {saved.topicIds.length} intereses de mentoría.</p>
          </div>
        </div>
      )}

      <footer className="interests-actions">
        <SecondaryButton disabled={saving} onClick={() => leave(areasHref)}>
          <ArrowLeftIcon size={16} aria-hidden="true" />
          Volver a Áreas técnicas
        </SecondaryButton>
        <span role="status">{dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}</span>
        <SecondaryButton disabled={!dirty || saving} onClick={() => setDialog('discard')}>
          Descartar cambios
        </SecondaryButton>
        <PrimaryButton disabled={!dirty} loading={saving} onClick={() => setDialog('save')}>
          Guardar configuración ({draft.topicIds.length})
        </PrimaryButton>
        {success && (
          <SecondaryButton className="interests-return-profile" onClick={() => leave('/mentorship/profile')}>
            <CheckIcon size={16} aria-hidden="true" />
            Volver a mi perfil
          </SecondaryButton>
        )}
      </footer>

      {/* Modal guardar configuración */}
      <ConfirmModal
        open={dialog === 'save'}
        icon={SaveIcon}
        title="¿Guardar cambios en tus intereses?"
        description={`Tu perfil quedará con ${draft.topicIds.length} intereses de mentoría.`}
        cancelLabel="Seguir editando"
        confirmLabel="Guardar cambios"
        confirming={saving}
        onCancel={() => {
          setDialog(null);
          setError('');
        }}
        onConfirm={() => void save()}
      >
        <p>Se agregarán ({added.length}): {added.map(topicName).join(', ') || 'Ninguno'}.</p>
        <p>Se quitarán ({removed.length}): {removed.map(topicName).join(', ') || 'Ninguno'}.</p>
        {saved.areaIds.some((id) => !draft.areaIds.includes(id)) && (
          <p>También se actualizarán las áreas técnicas que quitaste.</p>
        )}
        {error && <p role="alert">{error}</p>}
      </ConfirmModal>

      {/* Modal descartar */}
      <ConfirmModal
        open={dialog === 'discard' || dialog === 'leave'}
        icon={Undo2Icon}
        title="¿Descartar los cambios?"
        description="Tu selección volverá a los últimos intereses guardados."
        cancelLabel="Seguir editando"
        confirmLabel="Descartar cambios"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDraft(saved);
          setDialog(null);
          setSuccess(false);
          if (dialog === 'leave') navigate(destination);
        }}
      />

      {/* CAF-14 / Task #270: Quitar área con intereses asociados */}
      <ConfirmModal
        open={!!removingArea}
        icon={Trash2Icon}
        title="Esta área tiene tópicos asociados"
        description={`Si quitas ${removingArea?.name || ''}, se ocultarán y eliminarán sus intereses propios y sugeridos de tu perfil al confirmar.`}
        confirmLabel="Quitar de todos modos"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (removingArea) {
            change({ ...draft, areaIds: draft.areaIds.filter((id) => id !== removingArea.id) });
          }
          setDialog(null);
        }}
      >
        <h3>Tópicos que se quitarán</h3>
        <p>{affectedTopics.map((topic) => topic.name).join(', ') || 'No hay tópicos seleccionados en esta área.'}</p>
      </ConfirmModal>

      {/* CAF-09: Confirmación para eliminar interés personalizado */}
      <ConfirmModal
        open={!!deletingTopic}
        icon={Trash2Icon}
        title="¿Eliminar interés personalizado?"
        description={`¿Estás seguro de quitar "${deletingTopic?.name || ''}" de tu perfil?`}
        confirmLabel="Eliminar interés"
        confirming={saving}
        onCancel={() => setDeletingTopic(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      {/* CAF-10: Confirmación / modal para editar interés personalizado */}
      <ConfirmModal
        open={!!editingTopic}
        icon={PencilIcon}
        title="Editar interés personalizado"
        description="Modifica el tema de interés para esta área técnica."
        confirmLabel="Guardar cambios"
        confirming={saving}
        onCancel={() => setEditingTopic(null)}
        onConfirm={() => void handleConfirmEdit()}
      >
        <div style={{ marginTop: 12 }}>
          <label htmlFor="edit-custom-topic-input" style={{ fontSize: 13, fontWeight: 600 }}>
            Tema de interés ({editingTopic?.name.length || 0}/50)
          </label>
          <input
            id="edit-custom-topic-input"
            type="text"
            className="custom-topic-edit-input"
            maxLength={50}
            value={editingTopic?.name || ''}
            onChange={(e) => {
              const val = e.target.value;
              setEditingTopic((prev) => (prev ? { ...prev, name: val, error: undefined } : null));
            }}
          />
          {editingTopic?.error && (
            <p role="alert" className="custom-topic-error">
              {editingTopic.error}
            </p>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}
