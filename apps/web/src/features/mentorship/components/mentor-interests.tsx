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
  CloudIcon,
  BrainIcon,
  BugIcon,
  ShieldIcon,
  BriefcaseIcon,
  CircleDotIcon,
  BadgeCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PencilIcon,
} from 'lucide-react';
import { ConfirmModal } from '@/shared/components/confirm-modal';
import { PrimaryButton, SecondaryButton } from './mentor-button';
import { MentorProfileCompleteness, notifyMentorProfileChanged } from './mentor-profile-completeness';
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
  nextHref?: string;
  onNavigate?: (href: string) => void;
  profile?: MentorState;
  minimumAreas?: number;
}

function normalizedName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Icono estable por área: evita que todas las tarjetas usen el mismo. */
function areaIcon(name: string) {
  const value = normalizedName(name);
  if (value.includes('backend')) return ServerIcon;
  if (value.includes('frontend')) return MonitorIcon;
  if (value.includes('base') && value.includes('datos')) return DatabaseIcon;
  if (value.includes('cloud') || value.includes('devops')) return CloudIcon;
  if (value.includes('datos') || value.includes('inteligencia') || value.includes(' ia')) return BrainIcon;
  if (value.includes('qa') || value.includes('prueba') || value.includes('testing')) return BugIcon;
  if (value.includes('seguridad') || value.includes('ciber')) return ShieldIcon;
  if (value.includes('gestion')) return BriefcaseIcon;
  return CircleDotIcon;
}

function pluralTopics(count: number): string {
  return `${count} ${count === 1 ? 'tópico' : 'tópicos'}`;
}

export function MentorInterests({
  catalog,
  initialConfiguration,
  onSave,
  onCreateCustomTopic,
  onUpdateCustomTopic,
  onDeleteCustomTopic,
  areasHref = '/mentorship/profile/areas',
  nextHref = '/mentorship/profile/availability',
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
  const [saveDestination, setSaveDestination] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null>(null);
  const removedAreaTopics = useRef(new Map<string, string[]>());

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
  // Mantener visibles las áreas quitadas del borrador hasta confirmar el guardado.
  const visibleAreas = currentCatalog.filter((area) =>
    saved.areaIds.includes(area.id) || draft.areaIds.includes(area.id));
  // HU 6.13: el enlace del checklist enfoca el primer tópico sugerido cuando aún no hay intereses.
  const firstSuggestedId = draft.topicIds.length
    ? undefined
    : currentCatalog
        .filter((area) => draft.areaIds.includes(area.id))
        .flatMap((area) => area.topics)
        .find((topic) => !topic.isCustom)?.id;
  const added = draft.topicIds.filter((id) => !saved.topicIds.includes(id));
  const removed = saved.topicIds.filter((id) => !draft.topicIds.includes(id));
  const topicName = (id: string) =>
    currentCatalog.flatMap((area) => area.topics).find((topic) => topic.id === id)?.name || id;
  const removingArea = currentCatalog.find((area) => dialog === `area:${area.id}`);
  const affectedTopics = removingArea?.topics.filter((topic) => draft.topicIds.includes(topic.id)) || [];
  const navigate = (href: string) => (onNavigate ? onNavigate(href) : router.push(href));
  const registerChip = (id: string) => (element: HTMLButtonElement | null) => {
    if (element) chipRefs.current.set(id, element);
    else chipRefs.current.delete(id);
  };

  // Mantiene el foco del chip después de alternarlo.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const element = chipRefs.current.get(id);
    if (element) {
      element.focus();
      pendingFocus.current = null;
    }
  });

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

  function reactivateArea(area: InterestArea) {
    const topics = removedAreaTopics.current.get(area.id) ??
      saved.topicIds.filter((id) => area.topics.some((topic) => topic.id === id));
    change({
      areaIds: [...draft.areaIds, area.id],
      topicIds: Array.from(new Set([...draft.topicIds, ...topics])),
    });
    removedAreaTopics.current.delete(area.id);
  }

  function leave(href: string) {
    if (savingRef.current) return;
    if (!dirty) navigate(href);
    else {
      setDestination(href);
      setDialog('leave');
    }
  }

  async function save(nextHref?: string) {
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
      removedAreaTopics.current.clear();
      setSuccess(true);
      notifyMentorProfileChanged();
      setStatusMessage('');
      setDialog(null);
      if (nextHref) navigate(nextHref);
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

      {!visibleAreas.length && <p>No hay áreas técnicas seleccionadas. Configura tus áreas técnicas para ver sus tópicos.</p>}

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
        {visibleAreas.map((area) => {
          const enabled = draft.areaIds.includes(area.id) && area.locked !== true;
          const selected = area.topics.filter((topic) => draft.topicIds.includes(topic.id));
          const suggested = area.topics.filter((topic) => !topic.isCustom && !draft.topicIds.includes(topic.id));
          const customCount = selected.filter((t) => t.isCustom).length;
          const isAtLimit = customCount >= MAX_CUSTOM_TOPICS_PER_AREA;
          const AreaIcon = areaIcon(area.name);
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
                  {area.description && <p>{area.description}</p>}
                </div>
              </div>
              {enabled && area.topics.length === 0 && (
                <p>Esta área todavía no tiene tópicos disponibles en el catálogo.</p>
              )}

              {enabled ? (
                <>
                  <h4>En tu perfil · {pluralTopics(selected.length)}</h4>
                  {selected.length === 0 && <p>Aún no seleccionaste intereses en esta área.</p>}
                  <div className="interest-topics">
                    {selected.map((topic) => (
                      <div key={topic.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          ref={registerChip(topic.id)}
                          aria-pressed="true"
                          disabled={saving}
                          onClick={() => {
                            pendingFocus.current = topic.id;
                            if (topic.isCustom) setDeletingTopic(topic);
                            else change({ ...draft, topicIds: draft.topicIds.filter((id) => id !== topic.id) });
                          }}
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
                    {suggested.map((topic) => (
                      <button
                        id={topic.id === firstSuggestedId ? 'first-incomplete' : undefined}
                        key={topic.id}
                        ref={registerChip(topic.id)}
                        type="button"
                        aria-pressed="false"
                        disabled={saving}
                        onClick={() => {
                          pendingFocus.current = topic.id;
                          change({ ...draft, topicIds: [...draft.topicIds, topic.id] });
                        }}
                      >
                        <PlusIcon size={14} aria-hidden="true" />
                        {topic.name}
                      </button>
                    ))}
                  </div>
                  {suggested.length === 0 && (
                    <p>No hay más tópicos sugeridos en esta área.</p>
                  )}

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
                  <h4>En tu perfil · {pluralTopics(0)}</h4>
                  <p>{saved.areaIds.includes(area.id)
                    ? 'Quitaste esta área de la selección actual. Puedes reactivarla aquí sin perder los demás cambios.'
                    : 'Área no incluida en tu selección técnica. Para seleccionar estos tópicos, primero debes agregar esta área en Áreas técnicas.'}</p>
                  <div className="interest-topics">
                    {area.topics.map((topic) => (
                      <button key={topic.id} type="button" disabled>
                        <LockKeyholeIcon size={14} aria-hidden="true" />
                        {topic.name}
                      </button>
                    ))}
                  </div>
                  <SecondaryButton disabled={saving} onClick={() =>
                    saved.areaIds.includes(area.id) ? reactivateArea(area) : leave(areasHref)}>
                    Activar esta área técnica
                  </SecondaryButton>
                </>
              )}
            </section>
          );
        })}
      </div>

      <p className="interests-catalog-note">
        Solo puedes seleccionar tópicos de tus áreas técnicas.{' '}
        <button type="button" disabled={saving} onClick={() => leave(areasHref)}>
          Agregar otra área
        </button>
      </p>

      <MentorProfileCompleteness />

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
          Atrás: Áreas técnicas
        </SecondaryButton>
        <span role="status">{dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}</span>
        <SecondaryButton disabled={!dirty || saving} onClick={() => setDialog('discard')}>
          Descartar cambios
        </SecondaryButton>
        {dirty && (
          <SecondaryButton disabled={saving} onClick={() => { setSaveDestination(undefined); setDialog('save'); }}>
            Guardar
          </SecondaryButton>
        )}
        {dirty ? (
          <PrimaryButton loading={saving} iconRight={ArrowRightIcon} onClick={() => { setSaveDestination(nextHref); setDialog('save'); }}>
            Guardar y continuar
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={saving} iconRight={ArrowRightIcon} onClick={() => leave(nextHref)}>
            Continuar a disponibilidad
          </PrimaryButton>
        )}
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
        confirmLabel={saveDestination ? 'Guardar y continuar' : 'Guardar cambios'}
        confirming={saving}
        onCancel={() => {
          setDialog(null);
          setSaveDestination(undefined);
          setError('');
        }}
        onConfirm={() => void save(saveDestination)}
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
          removedAreaTopics.current.clear();
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
            removedAreaTopics.current.set(removingArea.id, affectedTopics.map((topic) => topic.id));
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
