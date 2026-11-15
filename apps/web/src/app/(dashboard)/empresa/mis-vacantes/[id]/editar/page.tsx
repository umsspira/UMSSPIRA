'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, FolderOpen, AlertCircle, CheckCircle2, 
  Lightbulb, Save, X
} from 'lucide-react';
import { getAccessToken } from '@/shared/services/auth-session';
import { API_BASE_URL } from '@/shared/config/api';

export default function EditarVacantePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveHovered, setIsSaveHovered] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [titulo, setTitulo] = useState('');
  const [modalidad, setModalidad] = useState('Híbrido');
  const [nivel, setNivel] = useState('Junior');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState('ACTIVA');

  useEffect(() => {
    if (toast?.type !== 'error') return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const fetchVacante = async () => {
      try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/api/v1/vacantes/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('No se pudo cargar la vacante.');
        }

        const encontrada = await response.json();
        if (!encontrada) throw new Error('No se encontró la vacante.');

        setTitulo(encontrada.titulo || '');

        const mod = String(encontrada.modalidad).toUpperCase().trim();
        if (mod === 'REMOTO') setModalidad('Remoto');
        else if (mod === 'HIBRIDO' || mod === 'HÍBRIDO') setModalidad('Híbrido');
        else setModalidad('Presencial');

        const niv = String(encontrada.nivel_experiencia).toUpperCase().trim();
        if (niv === 'JUNIOR' || niv === 'SIN_EXPERIENCIA') setNivel('Junior');
        else if (niv === 'SEMI-SENIOR') setNivel('Semi-Senior');
        else setNivel('Senior');

        setDescripcion(encontrada.descripcion_tecnica || '');

        if (['PUBLICADO', 'PUBLICADA', 'ACTIVA'].includes(String(encontrada.estado).toUpperCase())) setEstado('ACTIVA');
        else setEstado(encontrada.estado);
      } catch (error) {
        console.error("Error cargando vacante", error);
        setLoadError('No se pudo cargar la vacante. Vuelve a Mis vacantes e inténtalo de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchVacante();
  }, [id]);

  const handleGuardar = async () => {
    if (!titulo.trim() || !descripcion.trim()) {
      setToast({ type: 'error', message: 'Completa el título y los requisitos técnicos antes de guardar.' });
      return;
    }

    setIsSaving(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/vacantes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          titulo: titulo.trim(), 
          modalidad, 
          nivel_experiencia: nivel, 
          descripcion_tecnica: descripcion.trim()
        })
      });

      if (!response.ok) {
        throw new Error('No se pudo guardar la vacante. Revisa los datos e inténtalo de nuevo.');
      }
      setToast({ type: 'success', message: 'Vacante actualizada exitosamente' });
      window.setTimeout(() => router.push('/empresa/mis-vacantes'), 1800);
    } catch (error) {
      console.error(error);
      setIsSaving(false);
      setToast({
        type: 'error',
        message: error instanceof Error
          ? error.message
          : 'No se pudo completar la actualización. Inténtalo de nuevo.',
      });
    }
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>;
  if (loadError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#111827' }}>
        <p role="alert">{loadError}</p>
        <Link href="/empresa/mis-vacantes">Volver a Mis vacantes</Link>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--palladian)', minHeight: '100vh', padding: 'clamp(1rem, 4vw, 2rem)', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        <Link href="/empresa/mis-vacantes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Volver a Mis vacantes
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#fff', border: '1px solid var(--oatmeal)', borderRadius: '0.75rem', color: 'var(--flame)' }}>
              <FolderOpen size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                Editar vacante
              </h1>
              <p style={{ color: '#4b5563', fontSize: '0.95rem', margin: '0.2rem 0 0 0', fontWeight: 500 }}>
                Modifica los campos habilitados de la vacante publicada.
              </p>
            </div>
          </div>
          
          <span style={{ backgroundColor: estado === 'ACTIVA' ? '#dcfce7' : '#f3f4f6', color: estado === 'ACTIVA' ? '#15803d' : '#374151', padding: '0.4rem 0.8rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: estado === 'ACTIVA' ? '#22c55e' : '#6b7280' }}></div>
            {estado}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '2rem', alignItems: 'start' }}>
          
          <div style={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--oatmeal)', padding: 'clamp(1.25rem, 4vw, 2.5rem)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#111827', marginBottom: '0.5rem' }}>Título <span style={{ color: '#dc2626' }}>*</span></label>
                  <input 
                    type="text" 
                    value={titulo} 
                    onChange={(event) => setTitulo(event.target.value)}
                    maxLength={150}
                    required
                    style={{ width: '100%', height: '3rem', padding: '0 1rem', borderRadius: '0.5rem', border: '1px solid var(--oatmeal)', backgroundColor: '#fff', color: '#111827', fontSize: '0.875rem', outline: 'none' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#111827', marginBottom: '0.5rem' }}>Modalidad <span style={{ color: '#dc2626' }}>*</span></label>
                  <select 
                    value={modalidad} 
                    onChange={(e) => setModalidad(e.target.value)}
                    style={{ width: '100%', height: '3rem', padding: '0 1rem', borderRadius: '0.5rem', border: '1px solid var(--oatmeal)', backgroundColor: '#fff', color: '#111827', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', fontWeight: 500 }}
                  >
                    <option value="Remoto">Remoto</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="Presencial">Presencial</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#111827', marginBottom: '0.5rem' }}>Nivel de experiencia <span style={{ color: '#dc2626' }}>*</span></label>
                  <select 
                    value={nivel} 
                    onChange={(e) => setNivel(e.target.value)}
                    style={{ width: '100%', height: '3rem', padding: '0 1rem', borderRadius: '0.5rem', border: '1px solid var(--oatmeal)', backgroundColor: '#fff', color: '#111827', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', fontWeight: 500 }}
                  >
                    <option value="Junior">Junior</option>
                    <option value="Semi-Senior">Semi-Senior</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#111827', marginBottom: '0.5rem' }}>Descripción técnica y requisitos <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea 
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={6}
                  maxLength={20000}
                  required
                  style={{ width: '100%', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--oatmeal)', backgroundColor: '#fff', color: '#111827', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontWeight: 500, lineHeight: 1.5 }}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>Incluye tecnologías, herramientas y conocimientos necesarios. {descripcion.length}/20000</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--oatmeal)', paddingTop: '1.5rem' }}>
                <button 
                  onClick={() => router.push('/empresa/mis-vacantes')}
                  style={{ padding: '0.6rem 1.5rem', border: '1px solid var(--oatmeal)', backgroundColor: '#fff', color: '#374151', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <X size={16} /> Cancelar
                </button>
                <button 
                  onClick={handleGuardar}
                  disabled={isSaving}
                  onMouseEnter={() => setIsSaveHovered(true)}
                  onMouseLeave={() => setIsSaveHovered(false)}
                  onFocus={() => setIsSaveHovered(true)}
                  onBlur={() => setIsSaveHovered(false)}
                  style={{ padding: '0.6rem 1.5rem', border: 'none', backgroundColor: isSaving ? 'var(--flame)' : isSaveHovered ? '#e87512' : 'var(--flame)', color: '#fff', borderRadius: '0.5rem', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.7 : 1, transition: 'background-color 160ms ease, box-shadow 160ms ease', boxShadow: isSaveHovered && !isSaving ? '0 4px 12px rgba(232, 117, 18, 0.28)' : 'none' }}
                >
                  <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>

          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--oatmeal)', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.4rem', borderRadius: '0.4rem' }}>
                <Lightbulb size={20} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#111827', margin: 0 }}>Consejos para editar tu publicación</h3>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5, fontWeight: 500 }}>
                <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                Una oferta clara y detallada ayuda a recibir mejores candidatos.
              </li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5, fontWeight: 500 }}>
                <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                Mantén un título claro y directo para atraer talento.
              </li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5, fontWeight: 500 }}>
                <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                Ajusta las habilidades y conocimientos requeridos según el perfil que buscas.
              </li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5, fontWeight: 500 }}>
                <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                Revisa los cambios antes de guardar la actualización.
              </li>
            </ul>

            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', display: 'flex', gap: '0.75rem' }}>
              <AlertCircle size={20} color="#b45309" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#b45309', fontWeight: 500, lineHeight: 1.5 }}>
                Una buena descripción ayuda a que los candidatos entiendan mejor qué perfil estás buscando.
              </p>
            </div>
          </div>

        </div>
      </div>
      {toast && (
        <div
          role={toast.type === 'success' ? 'status' : 'alert'}
          aria-live={toast.type === 'success' ? 'polite' : 'assertive'}
          style={{
            position: 'fixed',
            right: '1.5rem',
            bottom: '1.5rem',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            maxWidth: 'calc(100vw - 3rem)',
            padding: '1rem 1.25rem',
            border: '1px solid var(--oatmeal)',
            borderLeft: '4px solid var(--flame)',
            borderRadius: '0.75rem',
            backgroundColor: '#fff',
            color: '#111827',
            boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} color="#16a34a" aria-hidden="true" />
          ) : (
            <AlertCircle size={20} color="#dc2626" aria-hidden="true" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}