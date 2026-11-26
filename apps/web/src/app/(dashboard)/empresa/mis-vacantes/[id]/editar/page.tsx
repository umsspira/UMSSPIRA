
'use client';

import { useState, useEffect, useMemo } from 'react';
import { normalizeVacancyStatus } from '@/shared/utils/vacancy-status';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Save,
  X
} from 'lucide-react';
import { getAccessToken } from '@/shared/services/auth-session';
import { API_BASE_URL } from '@/shared/config/api';
import { ActionNotice } from '@/shared/components/action-notice';
import { Cargando, EstadoError } from '../../../_components/estado-pantalla';

interface ValoresEditables {
  modalidad: string;
  nivel: string;
  descripcion: string;
  requisitosTecnicos: string[];
}

export default function EditarVacantePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [titulo, setTitulo] = useState('');
  const [modalidad, setModalidad] = useState('Híbrido');
  const [nivel, setNivel] = useState('Junior');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState('ACTIVA');

  const [requisitosTecnicos, setRequisitosTecnicos] = useState<string[]>([]);
  const [requisitoDraft, setRequisitoDraft] = useState('');

  // BUG-01 (CAF-07): valores precargados contra los que se detectan cambios pendientes.
  const [valoresIniciales, setValoresIniciales] = useState<ValoresEditables | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');

  const hayCambios = useMemo(() => {
    if (!valoresIniciales) return false;
    return (
      modalidad !== valoresIniciales.modalidad ||
      nivel !== valoresIniciales.nivel ||
      descripcion !== valoresIniciales.descripcion ||
      requisitosTecnicos.join('\n') !== valoresIniciales.requisitosTecnicos.join('\n')
    );
  }, [modalidad, nivel, descripcion, requisitosTecnicos, valoresIniciales]);

  useEffect(() => {
    const fetchVacante = async () => {
      setIsLoading(true);
      setErrorCarga(false);
      setGuardadoOk(false);
      setErrorGuardado('');

      try {
        const token = getAccessToken();

        const response = await fetch(`${API_BASE_URL}/api/v1/vacantes/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const encontrada = await response.json();

          if (encontrada) {
            const mod = String(encontrada.modalidad).toUpperCase().trim();
            let modalidadUI = 'Presencial';

            if (mod === 'REMOTO') {
              modalidadUI = 'Remoto';
            } else if (mod === 'HIBRIDO' || mod === 'HÍBRIDO') {
              modalidadUI = 'Híbrido';
            }

            const niv = String(encontrada.nivel_experiencia).toUpperCase().trim();
            let nivelUI = 'Senior';

            if (niv === 'JUNIOR' || niv === 'SIN_EXPERIENCIA') {
              nivelUI = 'Junior';
            } else if (niv === 'SEMI-SENIOR') {
              nivelUI = 'Semi-Senior';
            }

            const descripcionUI = encontrada.descripcion_tecnica || '';
            const requisitosUI: string[] = Array.isArray(
              encontrada.requisito_tecnico_registros
            )
              ? encontrada.requisito_tecnico_registros.map(
                  (item: { nombre: string }) => item.nombre
                )
              : [];

            setTitulo(encontrada.titulo);
            setModalidad(modalidadUI);
            setNivel(nivelUI);
            setDescripcion(descripcionUI);
            setRequisitosTecnicos(requisitosUI);
            setEstado(normalizeVacancyStatus(encontrada.estado));
            setValoresIniciales({
              modalidad: modalidadUI,
              nivel: nivelUI,
              descripcion: descripcionUI,
              requisitosTecnicos: requisitosUI
            });
          }
        } else {
          setErrorCarga(true);
        }
      } catch (error) {
        console.error('Error cargando vacante', error);
        setErrorCarga(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVacante();
  }, [id, reloadKey]);

  const handleGuardar = async () => {
    // BUG-01: nunca se envía una actualización cuando no hay modificaciones.
    if (!hayCambios) return;

    setIsSaving(true);
    setGuardadoOk(false);
    setErrorGuardado('');

    try {
      const token = getAccessToken();

      // Convertir las etiquetas de modalidad al formato esperado por la API.
      const modalidadApi = ({
        Remoto: 'REMOTO',
        'Híbrido': 'HIBRIDO',
        Presencial: 'PRESENCIAL'
      } as Record<string, string>)[modalidad] ?? modalidad;

      const response = await fetch(`${API_BASE_URL}/api/v1/vacantes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          titulo,
          modalidad: modalidadApi,
          nivel_experiencia: nivel,
          descripcion_tecnica: descripcion,
          requisitosTecnicos
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);

        throw new Error(
          errorBody?.error?.message ?? 'Error al guardar en el servidor'
        );
      }

      // BUG-02: la confirmación se muestra con el componente de avisos de la
      // aplicación; no se usan alertas nativas del navegador.
      setValoresIniciales({ modalidad, nivel, descripcion, requisitosTecnicos });
      setGuardadoOk(true);

    } catch (error) {
      console.error(error);
      setErrorGuardado(
        error instanceof Error && error.message
          ? error.message
          : 'Hubo un error al guardar los cambios.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Cargando texto="Cargando..." />;
  }

  if (errorCarga) {
    return (
      <EstadoError
        mensaje="No se pudo cargar la vacante. Revisa tu conexión e inténtalo de nuevo."
        onReintentar={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  return (
    <div
      className="p-4 md:p-8 overflow-x-hidden"
      style={{
        backgroundColor: 'var(--palladian)',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <Link
          href="/empresa/mis-vacantes"
          className="min-h-11 md:min-h-0"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#4b5563',
            textDecoration: 'none',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} />
          Volver a Mis vacantes
        </Link>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              minWidth: 0
            }}
          >
            <div
              style={{
                flexShrink: 0,
                padding: '0.75rem',
                backgroundColor: '#fff',
                border: '1px solid var(--oatmeal)',
                borderRadius: '0.75rem',
                color: 'var(--flame)'
              }}
            >
              <FolderOpen size={28} />
            </div>

            <div>
              <h1
                style={{
                  fontSize: 'clamp(1.35rem, 5.5vw, 1.75rem)',
                  fontWeight: '800',
                  color: '#111827',
                  margin: 0
                }}
              >
                Editar vacante
              </h1>

              <p
                style={{
                  color: '#4b5563',
                  fontSize: '0.95rem',
                  margin: '0.2rem 0 0 0',
                  fontWeight: 500
                }}
              >
                Modifica los campos habilitados de la vacante publicada.
              </p>
            </div>
          </div>

          <span
            style={{
              backgroundColor: estado === 'ACTIVA' ? '#dcfce7' : '#f3f4f6',
              color: estado === 'ACTIVA' ? '#15803d' : '#374151',
              padding: '0.4rem 0.8rem',
              borderRadius: '99px',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: estado === 'ACTIVA' ? '#22c55e' : '#6b7280'
              }}
            />
            {estado}
          </span>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[2fr_1fr] md:gap-8">

          <div
            className="min-w-0 p-5 md:p-10"
            style={{
              backgroundColor: '#fff',
              borderRadius: '1rem',
              border: '1px solid var(--oatmeal)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      color: '#111827',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Título <span style={{ color: '#dc2626' }}>*</span>
                  </label>

                  <input
                    type="text"
                    value={titulo}
                    readOnly
                    style={{
                      width: '100%',
                      height: '3rem',
                      padding: '0 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--oatmeal)',
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      outline: 'none',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      color: '#111827',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Modalidad <span style={{ color: '#dc2626' }}>*</span>
                  </label>

                  <select
                    value={modalidad}
                    onChange={(e) => setModalidad(e.target.value)}
                    style={{
                      width: '100%',
                      height: '3rem',
                      padding: '0 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--oatmeal)',
                      backgroundColor: '#fff',
                      color: '#111827',
                      fontSize: '0.875rem',
                      outline: 'none',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    <option value="Remoto">Remoto</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="Presencial">Presencial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      color: '#111827',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Nivel de experiencia <span style={{ color: '#dc2626' }}>*</span>
                  </label>

                  <select
                    value={nivel}
                    onChange={(e) => setNivel(e.target.value)}
                    style={{
                      width: '100%',
                      height: '3rem',
                      padding: '0 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--oatmeal)',
                      backgroundColor: '#fff',
                      color: '#111827',
                      fontSize: '0.875rem',
                      outline: 'none',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    <option value="Junior">Junior</option>
                    <option value="Semi-Senior">Semi-Senior</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}
                >
                  Descripción técnica <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--oatmeal)',
                    backgroundColor: '#fff',
                    color: '#111827',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontWeight: 500,
                    lineHeight: 1.5
                  }}
                />

                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.5rem'
                  }}
                >
                  Incluye tecnologías, herramientas y conocimientos necesarios.
                </p>
              </div>

              {/* Requisitos técnicos */}
              <div>
                <label
                  htmlFor="req-edit"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}
                >
                  Requisitos técnicos
                </label>

                <input
                  id="req-edit"
                  value={requisitoDraft}
                  maxLength={200}
                  onChange={(event) => setRequisitoDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();

                      const name = requisitoDraft.trim().replace(/\s+/g, ' ');
                      const key = name
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase();

                      if (
                        name &&
                        requisitosTecnicos.length < 30 &&
                        !requisitosTecnicos.some(
                          (item) =>
                            item
                              .normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .toLowerCase() === key
                        )
                      ) {
                        setRequisitosTecnicos((items) => [...items, name]);
                      }

                      if (name) setRequisitoDraft('');
                    }
                  }}
                  placeholder="Escribe un requisito y presiona Enter"
                  style={{
                    width: '100%',
                    height: '3rem',
                    padding: '0 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--oatmeal)'
                  }}
                />

                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.4rem'
                  }}
                >
                  {requisitosTecnicos.length} de 30 requisitos
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  {requisitosTecnicos.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() =>
                        setRequisitosTecnicos((items) =>
                          items.filter((item) => item !== name)
                        )
                      }
                      style={{
                        border: '1px solid var(--oatmeal)',
                        borderRadius: '999px',
                        padding: '0.3rem 0.7rem'
                      }}
                    >
                      {name} ×
                    </button>
                  ))}
                </div>
              </div>

              {guardadoOk && (
                <ActionNotice
                  state="success"
                  message="Vacante actualizada correctamente"
                  description="Los cambios ya están publicados en tu vacante."
                />
              )}

              {errorGuardado && (
                <ActionNotice
                  state="error"
                  message={errorGuardado}
                  onRetry={handleGuardar}
                />
              )}

              <div
                className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4"
                style={{
                  marginTop: '1rem',
                  borderTop: '1px solid var(--oatmeal)',
                  paddingTop: '1.5rem'
                }}
              >
                <button
                  onClick={() => router.push('/empresa/mis-vacantes')}
                  className="min-h-11 w-full justify-center sm:w-auto md:min-h-0"
                  style={{
                    padding: '0.6rem 1.5rem',
                    border: '1px solid var(--oatmeal)',
                    backgroundColor: '#fff',
                    color: '#374151',
                    borderRadius: '0.5rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <X size={16} />
                  Cancelar
                </button>

                <button
                  onClick={handleGuardar}
                  disabled={isSaving || !hayCambios}
                  className="min-h-11 w-full justify-center sm:w-auto md:min-h-0"
                  style={{
                    padding: '0.6rem 1.5rem',
                    border: 'none',
                    backgroundColor: 'var(--flame)',
                    color: '#fff',
                    borderRadius: '0.5rem',
                    fontWeight: 'bold',
                    cursor: isSaving || !hayCambios ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: isSaving || !hayCambios ? 0.7 : 1
                  }}
                >
                  <Save size={16} />
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>

          {/* Consejos para editar */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '1rem',
              border: '1px solid var(--oatmeal)',
              padding: '1.5rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}
            >
              <div
                style={{
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  padding: '0.4rem',
                  borderRadius: '0.4rem'
                }}
              >
                <Lightbulb size={20} />
              </div>

              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: '800',
                  color: '#111827',
                  margin: 0
                }}
              >
                Consejos para editar tu publicación
              </h3>
            </div>

            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <li
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  color: '#4b5563',
                  lineHeight: 1.5,
                  fontWeight: 500
                }}
              >
                <CheckCircle2
                  size={18}
                  color="#22c55e"
                  style={{ flexShrink: 0, marginTop: '0.1rem' }}
                />
                Una oferta clara y detallada ayuda a recibir mejores candidatos.
              </li>

              <li
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  color: '#4b5563',
                  lineHeight: 1.5,
                  fontWeight: 500
                }}
              >
                <CheckCircle2
                  size={18}
                  color="#22c55e"
                  style={{ flexShrink: 0, marginTop: '0.1rem' }}
                />
                Mantén un título claro y directo para atraer talento.
              </li>

              <li
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  color: '#4b5563',
                  lineHeight: 1.5,
                  fontWeight: 500
                }}
              >
                <CheckCircle2
                  size={18}
                  color="#22c55e"
                  style={{ flexShrink: 0, marginTop: '0.1rem' }}
                />
                Ajusta las habilidades y conocimientos requeridos según el perfil que buscas.
              </li>

              <li
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  color: '#4b5563',
                  lineHeight: 1.5,
                  fontWeight: 500
                }}
              >
                <CheckCircle2
                  size={18}
                  color="#22c55e"
                  style={{ flexShrink: 0, marginTop: '0.1rem' }}
                />
                Revisa los cambios antes de guardar la actualización.
              </li>
            </ul>

            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '0.5rem',
                display: 'flex',
                gap: '0.75rem'
              }}
            >
              <AlertCircle
                size={20}
                color="#b45309"
                style={{ flexShrink: 0 }}
              />

              <p
                style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: '#b45309',
                  fontWeight: 500,
                  lineHeight: 1.5
                }}
              >
                Una buena descripción ayuda a que los candidatos entiendan mejor qué perfil estás buscando.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}