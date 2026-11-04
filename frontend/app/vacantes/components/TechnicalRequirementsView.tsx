'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Trash2,
  X,
} from 'lucide-react';
import type {
  NivelEsperado,
  RequisitoTecnico,
  TipoRequisito,
} from '../../../lib/vacancies/contracts';
import {
  NIVELES_ESPERADOS,
  TIPOS_REQUISITO,
} from '../../../lib/vacancies/contracts';
import {
  TechnicalRequirementsClient,
  technicalRequirementsClient,
} from '../../../lib/vacancies/technical-requirements-client';

interface TechnicalRequirementsViewProps {
  initialVacancyId?: string;
  initialVacancyTitle?: string;
}


export default function TechnicalRequirementsView({
  initialVacancyId = 'VAC-2026-047',
  initialVacancyTitle = 'Analista de Datos Junior',
}: TechnicalRequirementsViewProps) {
  const router = useRouter();

  // Unique IDs for accessibility
  const competenciaInputId = useId();
  const nivelSelectId = useId();
  const tipoSelectId = useId();
  const descripcionInputId = useId();
  const editNivelId = useId();
  const editTipoId = useId();

  // Vacancy state
  const [vacancyId] = useState<string>(initialVacancyId);
  const [vacancyTitle] = useState<string>(initialVacancyTitle);

  // Requirements state
  const [requirements, setRequirements] = useState<RequisitoTecnico[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add form state
  const [competencia, setCompetencia] = useState<string>('');
  const [nivel, setNivel] = useState<string>('');
  const [tipo, setTipo] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Notification banners
  const [successAlert, setSuccessAlert] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<RequisitoTecnico | null>(null);
  const [editNivel, setEditNivel] = useState<NivelEsperado>('Avanzado');
  const [editTipo, setEditTipo] = useState<TipoRequisito>('Obligatorio');

  // Load initial requirements on mount
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await technicalRequirementsClient.obtenerRequisitos(vacancyId);
        if (mounted) {
          // If empty in storage and this is the mockup demo vacancy, initialize with demo items
          if (data.length === 0 && vacancyId === 'VAC-2026-047') {
            const demoItems: RequisitoTecnico[] = [
              {
                id: 'demo-1',
                idVacante: vacancyId,
                competencia: 'SQL',
                nivel: 'Avanzado',
                tipo: 'Obligatorio',
                descripcion: 'Dominio de consultas y modelado relacional.',
                fechaCreacion: new Date().toISOString(),
              },
              {
                id: 'demo-2',
                idVacante: vacancyId,
                competencia: 'Python',
                nivel: 'Intermedio',
                tipo: 'Obligatorio',
                descripcion: 'Scripts para automatización y análisis exploratorio.',
                fechaCreacion: new Date().toISOString(),
              },
              {
                id: 'demo-3',
                idVacante: vacancyId,
                competencia: 'Power BI',
                nivel: 'Intermedio',
                tipo: 'Obligatorio',
                descripcion: 'Elaboración de dashboards y modelos de datos.',
                fechaCreacion: new Date().toISOString(),
              },
              {
                id: 'demo-4',
                idVacante: vacancyId,
                competencia: 'Excel',
                nivel: 'Avanzado',
                tipo: 'Deseable',
                descripcion: 'Tablas dinámicas y fórmulas complejas.',
                fechaCreacion: new Date().toISOString(),
              },
            ];
            TechnicalRequirementsClient.saveLocalRequirements(vacancyId, demoItems);
            setRequirements(demoItems);
          } else {
            setRequirements(data);
          }
        }
      } catch {
        if (mounted) {
          setRequirements(TechnicalRequirementsClient.getLocalRequirements(vacancyId));
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [vacancyId]);

  // Real-time duplicate check against existing requirements
  const isDuplicate = useMemo(() => {
    if (!competencia.trim()) return false;
    const searchKey = TechnicalRequirementsClient.canonicalName(competencia);
    return requirements.some(
      (r) => TechnicalRequirementsClient.canonicalName(r.competencia) === searchKey,
    );
  }, [competencia, requirements]);

  // Form validity check
  const isFormValid = useMemo(() => {
    return (
      competencia.trim().length > 0 &&
      nivel !== '' &&
      tipo !== '' &&
      !isDuplicate
    );
  }, [competencia, nivel, tipo, isDuplicate]);

  // Handle adding new requirement
  const handleAddRequirement = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        competencia: competencia.trim(),
        nivel: nivel as NivelEsperado,
        tipo: tipo as TipoRequisito,
        descripcion: descripcion.trim() || undefined,
      };

      const added = await technicalRequirementsClient.asociarRequisitos(
        vacancyId,
        [payload],
      );

      setRequirements((prev) => [...prev, ...added]);
      setSuccessAlert({
        title: 'Requisito agregado',
        message: `${payload.competencia} se agregó correctamente a los requisitos de la vacante.`,
      });

      // Clear input fields
      setCompetencia('');
      setNivel('');
      setTipo('');
      setDescripcion('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo agregar el requisito.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (item: RequisitoTecnico) => {
    setEditingItem(item);
    setEditNivel(item.nivel);
    setEditTipo(item.tipo);
  };

  // Save changes from edit modal
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const updated = await technicalRequirementsClient.actualizarRequisito(
        vacancyId,
        editingItem.id,
        {
          nivel: editNivel,
          tipo: editTipo,
        },
      );

      setRequirements((prev) =>
        prev.map((r) => (r.id === editingItem.id ? updated : r)),
      );

      setSuccessAlert({
        title: 'Requisito actualizado',
        message: `Se actualizaron el nivel y tipo para ${editingItem.competencia}.`,
      });

      setEditingItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el requisito.';
      alert(msg);
    }
  };

  // Delete requirement
  const handleDelete = async (id: string, name: string) => {
    try {
      await technicalRequirementsClient.eliminarRequisito(vacancyId, id);
      setRequirements((prev) => prev.filter((r) => r.id !== id));
      setSuccessAlert({
        title: 'Requisito quitado',
        message: `Se quitó ${name} de los requisitos de la vacante.`,
      });
    } catch {
      // Ignored
    }
  };

  // Save all requirements action (finishes step)
  const handleSaveAll = () => {
    TechnicalRequirementsClient.saveLocalRequirements(vacancyId, requirements);
    setSuccessAlert({
      title: 'Requisitos guardados',
      message: 'Todos los requisitos técnicos fueron guardados exitosamente.',
    });
    setTimeout(() => {
      router.push('/vacantes');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#f3efe6] text-gray-900 font-sans flex flex-col">


      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Migas de pan"
          className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-1.5"
        >
          <Link href="/vacantes" className="hover:text-gray-800">
            Mis vacantes
          </Link>
          <span>/</span>
          <Link href="/vacantes/nueva" className="hover:text-gray-800">
            Nueva vacante
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-semibold">
            Requisitos técnicos
          </span>
        </nav>

        {/* Page Title & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#111827]">
            Requisitos técnicos
          </h1>
          <p className="mt-1 text-sm text-[#4b5563]">
            Define las competencias y el nivel esperado para el puesto.
          </p>
        </div>

        {/* Success Alert Banner (Mockup 3) */}
        {successAlert && (
          <div className="mb-6 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 flex items-start justify-between shadow-xs transition-all">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-[#22c55e] text-white flex items-center justify-center shrink-0">
                <Check size={16} strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#166534]">
                  {successAlert.title}
                </p>
                <p className="text-xs text-[#15803d] mt-0.5">
                  {successAlert.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessAlert(null)}
              className="text-[#166534] hover:text-[#14532d] p-1 rounded-md"
              aria-label="Cerrar alerta"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Vacancy Summary Card */}
        <div className="bg-[#243444] rounded-xl p-5 mb-6 text-white shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[#f59e0b] text-xs font-bold uppercase tracking-wider block">
              {vacancyId}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold mt-0.5 tracking-tight">
              {vacancyTitle}
            </h2>
          </div>

          <div className="bg-white text-[#182936] text-xs sm:text-sm font-semibold px-4 py-2 rounded-full shadow-xs">
            {requirements.length}{' '}
            {requirements.length === 1 ? 'requisito' : 'requisitos'}
          </div>
        </div>

        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Agregar requisito Card */}
          <div className="bg-white rounded-2xl border border-[#e5dfd4] p-6 shadow-xs">
            <h2 className="text-lg font-bold text-gray-900">
              Agregar requisito
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 mb-5">
              Completa todos los campos antes de añadirlo.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddRequirement();
              }}
              className="space-y-4"
            >
              {/* Competencia técnica input */}
              <div>
                <label
                  htmlFor={competenciaInputId}
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Competencia técnica <span className="text-red-500">*</span>
                </label>
                <input
                  id={competenciaInputId}
                  type="text"
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  placeholder=""
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors focus:outline-none ${
                    isDuplicate
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-gray-300 focus:border-[#ed9635] focus:ring-1 focus:ring-[#ed9635]'
                  }`}
                />


                {/* Duplicate Error Warning (Mockup 2) */}
                {isDuplicate && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">
                    {competencia.trim()} ya fue agregado a esta vacante.
                  </p>
                )}
              </div>

              {/* Nivel esperado & Tipo selects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={nivelSelectId}
                    className="block text-xs font-semibold text-gray-700 mb-1"
                  >
                    Nivel esperado <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={nivelSelectId}
                    value={nivel}
                    onChange={(e) => setNivel(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#ed9635] focus:ring-1 focus:ring-[#ed9635]"
                  >
                    <option value="">Selecciona un nivel</option>
                    {NIVELES_ESPERADOS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={tipoSelectId}
                    className="block text-xs font-semibold text-gray-700 mb-1"
                  >
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={tipoSelectId}
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#ed9635] focus:ring-1 focus:ring-[#ed9635]"
                  >
                    <option value="">Selecciona un tipo</option>
                    {TIPOS_REQUISITO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción opcional */}
              <div>
                <label
                  htmlFor={descripcionInputId}
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Descripción opcional
                </label>
                <textarea
                  id={descripcionInputId}
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Dominio de consultas y modelado relacional."
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#ed9635] focus:ring-1 focus:ring-[#ed9635] resize-none"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Ayuda a aclarar el requisito.
                </p>
              </div>

              {/* Submit button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-xs ${
                    isFormValid && !isSubmitting
                      ? 'bg-[#ed9635] hover:bg-[#d98322] text-white cursor-pointer'
                      : 'bg-[#d0c9be] text-white cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Añadiendo...' : 'Agregar requisito'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Requisitos agregados Card */}
          <div className="bg-white rounded-2xl border border-[#e5dfd4] p-6 shadow-xs flex flex-col justify-between min-h-[420px]">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Requisitos agregados
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 mb-4">
                Puedes editar o quitar requisitos antes de continuar.
              </p>

              {/* Empty state (Mockup 1) */}
              {isLoading ? (
                <div className="border border-[#e7e0d3] rounded-xl p-10 text-center bg-[#faf7f2]/50 text-gray-500 text-sm">
                  Cargando requisitos...
                </div>
              ) : requirements.length === 0 ? (
                <div className="border border-[#e7e0d3] rounded-xl p-12 text-center bg-[#faf7f2]/50">
                  <p className="font-bold text-gray-800 text-base">
                    Aún no agregaste requisitos
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Agrega la primera competencia técnica para esta vacante.
                  </p>
                </div>
              ) : (
                /* Non-empty state (Mockup 2 & 3) */
                <div className="space-y-3">
                  {requirements.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl px-4 py-3 flex items-center justify-between transition-colors ${
                        item.tipo === 'Deseable'
                          ? 'bg-[#fef7ee] border border-[#fed7aa]'
                          : 'bg-[#edf2f7] hover:bg-[#e2e8f0]'
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        <span className="font-bold text-sm text-gray-900 min-w-[70px]">
                          {item.competencia}
                        </span>
                        <span className="text-xs text-gray-500 min-w-[70px]">
                          {item.nivel}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span
                          className={`text-xs font-semibold ${
                            item.tipo === 'Deseable'
                              ? 'text-[#c2410c]'
                              : 'text-gray-900'
                          }`}
                        >
                          {item.tipo}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="text-xs font-semibold text-gray-700 hover:text-[#ed9635] transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.competencia)}
                          className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Quitar requisito"
                          aria-label={`Quitar requisito ${item.competencia}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom info note box */}
            <div className="mt-6 border border-[#e8e2d6] bg-[#faf8f4] rounded-xl p-3.5 text-xs text-gray-600 font-medium">
              No se permiten requisitos duplicados en una misma vacante.
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="mt-8 flex items-center justify-end gap-4">
          <Link
            href="/vacantes"
            className="bg-white border border-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-colors shadow-xs"
          >
            Atrás
          </Link>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={requirements.length === 0}
            className={`font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-xs ${
              requirements.length > 0
                ? 'bg-[#ed9635] hover:bg-[#d98322] text-white cursor-pointer'
                : 'bg-[#d0c9be] text-white cursor-not-allowed'
            }`}
          >
            Guardar requisitos
          </button>
        </div>
      </main>

      {/* Edit Requirement Modal (Mockup 4) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Tag pill */}
            <div className="inline-block bg-[#e0f2fe] text-[#0369a1] text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-3">
              {editingItem.competencia}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
              Editar requisito técnico
            </h3>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              Actualiza el nivel o el tipo del requisito seleccionado.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={editNivelId}
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Nivel esperado
                </label>
                <select
                  id={editNivelId}
                  value={editNivel}
                  onChange={(e) => setEditNivel(e.target.value as NivelEsperado)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#ed9635] focus:ring-1 focus:ring-[#ed9635]"
                >
                  {NIVELES_ESPERADOS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={editTipoId}
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Tipo
                </label>
                <select
                  id={editTipoId}
                  value={editTipo}
                  onChange={(e) => setEditTipo(e.target.value as TipoRequisito)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#ed9635] focus:ring-1 focus:ring-[#ed9635]"
                >
                  {TIPOS_REQUISITO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Note container */}
            <div className="bg-[#faf8f4] border border-[#e8e2d6] rounded-xl p-3.5 my-6 text-xs text-gray-600 font-medium">
              Los cambios solo afectan este requisito.
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="bg-[#ed9635] hover:bg-[#d98322] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-[#e2dcd2] bg-transparent py-6 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-wrap items-center justify-between gap-3">
          <p>Universidad Mayor de San Simón | UMSS Vinculación Laboral</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-gray-800">
              Ayuda
            </Link>
            <span>·</span>
            <Link href="#" className="hover:text-gray-800">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
