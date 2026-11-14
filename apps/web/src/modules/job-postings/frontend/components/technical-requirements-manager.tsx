'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Pencil, Save, Trash2, X } from 'lucide-react';
import {
  normalizeTechnicalCompetency,
  TECHNICAL_REQUIREMENT_LEVELS,
  TECHNICAL_REQUIREMENT_TYPES,
  type TechnicalRequirementInput,
  type TechnicalRequirementItem,
  type TechnicalRequirementLevel,
  type TechnicalRequirementType,
} from '@umsspira/shared-types';
import { ApiError, clearToken } from '@/shared/services/api-client';
import {
  getTechnicalRequirements,
  saveTechnicalRequirements,
} from '../services/technical-requirements.service';

interface DraftRequirement extends TechnicalRequirementInput {
  key: string;
}

interface RequirementForm {
  competenciaTecnica: string;
  nivelEsperado: TechnicalRequirementLevel | '';
  tipo: TechnicalRequirementType;
  descripcion: string;
}

const EMPTY_FORM: RequirementForm = {
  competenciaTecnica: '',
  nivelEsperado: '',
  tipo: 'OBLIGATORIO',
  descripcion: '',
};

const LEVEL_LABELS: Record<TechnicalRequirementLevel, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

const TYPE_LABELS: Record<TechnicalRequirementType, string> = {
  OBLIGATORIO: 'Obligatorio',
  DESEABLE: 'Deseable',
};

const inputClassName =
  'w-full rounded-lg border border-[#D7D0C3] bg-[#F7F4EE] px-3 py-2.5 text-sm text-[#20252B] outline-none transition focus:border-[#2C3B4D] focus:bg-white focus:ring-2 focus:ring-[#2C3B4D]/15';

export function TechnicalRequirementsManager({ vacancyId }: { vacancyId: string }) {
  const router = useRouter();
  const nextDraftKey = useRef(0);
  const [vacancyTitle, setVacancyTitle] = useState('');
  const [requirements, setRequirements] = useState<DraftRequirement[]>([]);
  const [form, setForm] = useState<RequirementForm>(EMPTY_FORM);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RequirementForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canManage = !loading && Boolean(vacancyTitle);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getTechnicalRequirements(vacancyId)
      .then((result) => {
        if (!active) return;
        setVacancyTitle(result.vacanteTitulo);
        setRequirements(result.requisitos.map(toDraftRequirement));
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) {
          clearToken();
          router.replace('/login');
          return;
        }
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudieron cargar los requisitos técnicos de la vacante.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router, vacancyId]);

  const addRequirement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const competency = form.competenciaTecnica.trim();
    const expectedLevel = form.nivelEsperado;
    if (!competency || !expectedLevel) {
      setError('Completa la competencia técnica y el nivel esperado.');
      return;
    }
    if (requirements.some((item) => isSameCompetency(item.competenciaTecnica, competency))) {
      setError('Esa competencia técnica ya está agregada a esta vacante.');
      return;
    }

    setRequirements((current) => [
      ...current,
      {
        key: `draft-${nextDraftKey.current++}`,
        competenciaTecnica: competency,
        nivelEsperado: expectedLevel,
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
      },
    ]);
    setForm(EMPTY_FORM);
    setError(null);
    setNotice('Requisito agregado. Guarda los cambios para aplicarlos a la vacante.');
  };

  const startEditing = (requirement: DraftRequirement) => {
    setEditingKey(requirement.key);
    setEditForm(toRequirementForm(requirement));
    setError(null);
    setNotice(null);
  };

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const competency = editForm.competenciaTecnica.trim();
    const expectedLevel = editForm.nivelEsperado;
    if (!editingKey || !competency || !expectedLevel) {
      setError('Completa la competencia técnica y el nivel esperado.');
      return;
    }
    if (
      requirements.some(
        (item) => item.key !== editingKey && isSameCompetency(item.competenciaTecnica, competency),
      )
    ) {
      setError('Esa competencia técnica ya está agregada a esta vacante.');
      return;
    }

    setRequirements((current) =>
      current.map((item) =>
        item.key === editingKey
          ? {
              ...item,
              competenciaTecnica: competency,
              nivelEsperado: expectedLevel,
              tipo: editForm.tipo,
              descripcion: editForm.descripcion.trim(),
            }
          : item,
      ),
    );
    setEditingKey(null);
    setError(null);
    setNotice('Requisito actualizado. Guarda los cambios para aplicarlos a la vacante.');
  };

  const saveAllRequirements = async () => {
    if (!canManage || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await saveTechnicalRequirements(
        vacancyId,
        requirements.map(toRequirementInput),
      );
      setRequirements(result.requisitos.map(toDraftRequirement));
      setNotice('Los requisitos técnicos se guardaron correctamente.');
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        clearToken();
        router.replace('/login');
        return;
      }
      setError(
        cause instanceof Error ? cause.message : 'No se pudieron guardar los requisitos técnicos.',
      );
    } finally {
      setSaving(false);
    }
  };

  const removeRequirement = (key: string) => {
    setRequirements((current) => current.filter((requirement) => requirement.key !== key));
    if (editingKey === key) setEditingKey(null);
    setError(null);
    setNotice('Requisito quitado del borrador. Guarda los cambios para aplicarlo a la vacante.');
  };

  return (
    <main className="min-h-screen bg-[#F1EDE5] px-4 py-8 text-[#20252B] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/empresa/mis-vacantes"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#52606B] transition hover:text-[#183C56]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Mis vacantes
        </Link>

        <header className="mb-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#90785E]">
            Empresa / Mis vacantes / Requisitos técnicos
          </p>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF1E3] text-[#D97720]">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1B2632]">Requisitos técnicos</h1>
              <p className="mt-1 text-sm text-[#66717C]">
                Define las competencias y el nivel esperado para esta vacante.
              </p>
            </div>
          </div>
        </header>

        <section
          aria-label="Vacante seleccionada"
          className="mb-6 flex items-center justify-between gap-4 rounded-xl bg-[#2C3B4D] px-5 py-4 text-white shadow-sm"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E8B47A]">
              Vacante
            </p>
            <h2 className="mt-1 text-base font-semibold">
              {loading ? 'Cargando vacante…' : vacancyTitle || 'Vacante'}
            </h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2C3B4D]">
            {requirements.length} {requirements.length === 1 ? 'requisito' : 'requisitos'}
          </span>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mb-5 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {notice}
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.5fr)]">
          <section className="rounded-2xl border border-[#E4DED3] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1B2632]">Agregar requisito</h2>
            <p className="mt-1 text-sm text-[#66717C]">
              Completa los datos de una competencia técnica.
            </p>

            <form className="mt-5 space-y-4" onSubmit={addRequirement}>
              <div>
                <label
                  htmlFor="requirement-competency"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  Competencia técnica <span className="text-[#A35139]">*</span>
                </label>
                <input
                  id="requirement-competency"
                  maxLength={120}
                  required
                  value={form.competenciaTecnica}
                  onChange={(event) => {
                    setError(null);
                    setForm((current) => ({
                      ...current,
                      competenciaTecnica: event.target.value,
                    }));
                  }}
                  placeholder="Ej. SQL"
                  className={inputClassName}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="requirement-level" className="mb-1.5 block text-sm font-semibold">
                    Nivel esperado <span className="text-[#A35139]">*</span>
                  </label>
                  <select
                    id="requirement-level"
                    required
                    value={form.nivelEsperado}
                    onChange={(event) => {
                      setError(null);
                      setForm((current) => ({
                        ...current,
                        nivelEsperado: parseLevel(event.target.value),
                      }));
                    }}
                    className={inputClassName}
                  >
                    <option value="">Selecciona un nivel</option>
                    {TECHNICAL_REQUIREMENT_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {LEVEL_LABELS[level]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="requirement-type" className="mb-1.5 block text-sm font-semibold">
                    Tipo <span className="text-[#A35139]">*</span>
                  </label>
                  <select
                    id="requirement-type"
                    value={form.tipo}
                    onChange={(event) => {
                      setError(null);
                      setForm((current) => ({
                        ...current,
                        tipo: parseType(event.target.value),
                      }));
                    }}
                    className={inputClassName}
                  >
                    {TECHNICAL_REQUIREMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="requirement-description"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  Descripción opcional
                </label>
                <textarea
                  id="requirement-description"
                  maxLength={500}
                  rows={3}
                  value={form.descripcion}
                  onChange={(event) => {
                    setError(null);
                    setForm((current) => ({
                      ...current,
                      descripcion: event.target.value,
                    }));
                  }}
                  placeholder="Detalle el contexto o resultado esperado."
                  className={`${inputClassName} resize-y`}
                />
                <p className="mt-1 text-xs text-[#7B858E]">Máximo 500 caracteres.</p>
              </div>

              <button
                type="submit"
                disabled={!canManage || requirements.length >= 50}
                className="w-full rounded-lg bg-[#C9C1B1] px-4 py-2.5 text-sm font-bold text-[#1B2632] transition hover:bg-[#B8AF9F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Agregar requisito
              </button>
              {requirements.length >= 50 && (
                <p className="text-xs text-[#7B858E]">La vacante admite hasta 50 requisitos.</p>
              )}
            </form>
          </section>

          <section className="rounded-2xl border border-[#E4DED3] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-[#1B2632]">Requisitos agregados</h2>
              <p className="mt-1 text-sm text-[#66717C]">
                Revisa las competencias antes de guardar los cambios.
              </p>
            </div>

            {loading ? (
              <p
                role="status"
                className="rounded-xl bg-[#F7F4EE] p-8 text-center text-sm text-[#66717C]"
              >
                Cargando requisitos…
              </p>
            ) : requirements.length === 0 ? (
              <div className="rounded-xl bg-[#F7F4EE] px-5 py-10 text-center">
                <h3 className="font-semibold text-[#303A43]">Aún no agregaste requisitos</h3>
                <p className="mt-2 text-sm text-[#7B858E]">
                  Agrega y organiza las competencias técnicas para esta vacante.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5" aria-label="Lista de requisitos técnicos">
                {requirements.map((requirement) => (
                  <article
                    key={requirement.key}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(100px,0.7fr)_minmax(105px,0.7fr)_auto] ${
                      requirement.tipo === 'OBLIGATORIO' ? 'bg-[#EAF0F5]' : 'bg-[#FFF1DC]'
                    }`}
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[#263746]">
                        {requirement.competenciaTecnica}
                      </h3>
                      {requirement.descripcion && (
                        <p className="mt-1 truncate text-xs text-[#66717C]">
                          {requirement.descripcion}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-[#52606B]">
                      {LEVEL_LABELS[requirement.nivelEsperado]}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        requirement.tipo === 'OBLIGATORIO' ? 'text-[#52606B]' : 'text-[#A35139]'
                      }`}
                    >
                      {TYPE_LABELS[requirement.tipo]}
                    </span>
                    <div className="flex items-center justify-self-end">
                      <button
                        type="button"
                        onClick={() => startEditing(requirement)}
                        aria-label={`Editar ${requirement.competenciaTecnica}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#52606B] hover:bg-white/70 hover:text-[#183C56]"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRequirement(requirement.key)}
                        aria-label={`Quitar ${requirement.competenciaTecnica}`}
                        className="rounded-md p-2 text-[#A35139] transition hover:bg-white/70"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <p className="mt-4 rounded-lg border border-[#E4DED3] bg-[#F7F4EE] p-3 text-xs leading-5 text-[#66717C]">
              Los cambios se guardan juntos para mantener íntegra la lista de requisitos de esta
              vacante.
            </p>
          </section>
        </div>

        <footer className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-[#D9D2C5] pt-5 sm:flex-row">
          <Link
            href="/empresa/mis-vacantes"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[#C9C1B1] bg-white px-6 text-sm font-semibold text-[#1B2632] transition hover:bg-[#F7F4EE]"
          >
            Atrás
          </Link>
          <button
            type="button"
            onClick={saveAllRequirements}
            disabled={!canManage || saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#FFB162] px-6 text-sm font-bold text-[#1B2632] shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Guardando…' : 'Guardar requisitos'}
          </button>
        </footer>
      </div>

      {editingKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#16202a]/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditingKey(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-requirement-title"
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex rounded-full bg-[#EAF0F5] px-3 py-1 text-xs font-semibold text-[#2C3B4D]">
                  Editar
                </p>
                <h2 id="edit-requirement-title" className="text-xl font-bold text-[#1B2632]">
                  Editar requisito técnico
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                aria-label="Cerrar edición"
                className="rounded-md p-1 text-[#66717C] hover:bg-[#F1EDE5]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={saveEdit}>
              <div>
                <label
                  htmlFor="edit-requirement-competency"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  Competencia técnica <span className="text-[#A35139]">*</span>
                </label>
                <input
                  id="edit-requirement-competency"
                  maxLength={120}
                  required
                  value={editForm.competenciaTecnica}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      competenciaTecnica: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-requirement-level"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Nivel esperado <span className="text-[#A35139]">*</span>
                  </label>
                  <select
                    id="edit-requirement-level"
                    required
                    value={editForm.nivelEsperado}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        nivelEsperado: parseLevel(event.target.value),
                      }))
                    }
                    className={inputClassName}
                  >
                    {TECHNICAL_REQUIREMENT_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {LEVEL_LABELS[level]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-requirement-type"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Tipo <span className="text-[#A35139]">*</span>
                  </label>
                  <select
                    id="edit-requirement-type"
                    value={editForm.tipo}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        tipo: parseType(event.target.value),
                      }))
                    }
                    className={inputClassName}
                  >
                    {TECHNICAL_REQUIREMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="edit-requirement-description"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  Descripción opcional
                </label>
                <textarea
                  id="edit-requirement-description"
                  maxLength={500}
                  rows={3}
                  value={editForm.descripcion}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      descripcion: event.target.value,
                    }))
                  }
                  className={`${inputClassName} resize-y`}
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-[#EEE9DF] pt-4">
                <button
                  type="button"
                  onClick={() => setEditingKey(null)}
                  className="h-10 rounded-lg border border-[#C9C1B1] px-5 text-sm font-semibold text-[#1B2632] hover:bg-[#F7F4EE]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-[#FFB162] px-5 text-sm font-bold text-[#1B2632] hover:brightness-95"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function isSameCompetency(left: string, right: string): boolean {
  return normalizeTechnicalCompetency(left) === normalizeTechnicalCompetency(right);
}

function parseLevel(value: string): TechnicalRequirementLevel | '' {
  return TECHNICAL_REQUIREMENT_LEVELS.find((level) => level === value) ?? '';
}

function parseType(value: string): TechnicalRequirementType {
  return TECHNICAL_REQUIREMENT_TYPES.find((type) => type === value) ?? 'OBLIGATORIO';
}

function toDraftRequirement(requirement: TechnicalRequirementItem): DraftRequirement {
  return {
    key: requirement.id,
    competenciaTecnica: requirement.competenciaTecnica,
    nivelEsperado: requirement.nivelEsperado,
    tipo: requirement.tipo,
    descripcion: requirement.descripcion,
  };
}

function toRequirementInput(requirement: DraftRequirement): TechnicalRequirementInput {
  return {
    competenciaTecnica: requirement.competenciaTecnica,
    nivelEsperado: requirement.nivelEsperado,
    tipo: requirement.tipo,
    descripcion: requirement.descripcion,
  };
}

function toRequirementForm(requirement: DraftRequirement): RequirementForm {
  return {
    competenciaTecnica: requirement.competenciaTecnica,
    nivelEsperado: requirement.nivelEsperado,
    tipo: requirement.tipo,
    descripcion: requirement.descripcion,
  };
}
