'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Briefcase, Laptop, Calendar, 
  Pencil, Pause, Check, BarChart2, Lightbulb, Info
} from 'lucide-react';
import { getAccessToken } from '@/shared/services/auth-session';

export default function VacanteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [vacante, setVacante] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVacante = async () => {
      try {
        const token = getAccessToken();
        const response = await fetch(`http://localhost:3000/api/v1/vacantes/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data) setVacante(data);
        }
      } catch (error) {
        console.error("Error cargando detalle", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVacante();
  }, [id]);

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink)' }}>Cargando detalle...</div>;
  if (!vacante) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink)' }}>Vacante no encontrada</div>;

  const fechaPublicacion = new Date(vacante.created_at).toLocaleDateString('es-ES');
  const estadoUI = ['PUBLICADO', 'PUBLICADA', 'ACTIVA'].includes(String(vacante.estado).toUpperCase()) ? 'ACTIVA' : vacante.estado;

  return (
    <div style={{ backgroundColor: 'var(--palladian)', minHeight: '100vh', padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Volver */}
        <Link href="/empresa/mis-vacantes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--flame)'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#4b5563'}
        >
          <ArrowLeft size={16} /> Volver a Mis vacantes
        </Link>

        {/* HEADER CARD */}
        <div style={{ 
          backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--oatmeal)', padding: '1.5rem 2rem', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', 
          marginBottom: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.06)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.03)'}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ padding: '0.6rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', color: '#b45309', transition: 'all 0.3s ease' }}>
              <Briefcase size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', margin: 0 }}>{vacante.titulo}</h1>
                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {estadoUI}
                </span>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={14} /> Publicado: {fechaPublicacion}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button style={{ 
              padding: '0.5rem 1rem', border: '1px solid var(--oatmeal)', backgroundColor: '#fff', color: '#374151', 
              borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', 
              gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s ease' 
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Pause size={16} /> Pausar vacante
            </button>
            <button 
              onClick={() => router.push(`/empresa/mis-vacantes/${id}/editar`)}
              style={{ 
                padding: '0.5rem 1rem', border: 'none', backgroundColor: 'var(--flame)', color: '#fff', 
                borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', 
                gap: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,177,98,0.3)', transition: 'all 0.2s ease' 
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,177,98,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,177,98,0.3)'; }}
            >
              <Pencil size={16} /> Editar vacante
            </button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* COLUMNA IZQUIERDA */}
          <div style={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--oatmeal)', padding: '2.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.03)'}
          >
            
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', marginBottom: '1rem' }}>Propósito del Rol</h2>
            <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '2.5rem', fontWeight: 500, fontSize: '0.95rem' }}>
              {vacante.descripcion_tecnica || 'Buscamos un Desarrollador Backend Semi-Senior para integrarse al squad de Core Payments. Tu principal reto consistirá en diseñar, escalar y optimizar microservicios de alto rendimiento que procesan miles de transacciones financieras diarias en tiempo real, garantizando resiliencia y estricta integridad de datos.'}
            </p>

            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={20} color="#111827" /> Responsabilidades Clave
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                'Diseñar e implementar endpoints RESTful seguros y eficientes utilizando Python (FastAPI / Django).',
                'Optimizar consultas complejas y diseñar modelos relacionales en PostgreSQL para flujos de alta concurrencia.',
                'Mantener y robustecer pipelines de integración continua (CI/CD) junto al equipo de DevOps sobre infraestructura AWS.',
                'Escribir pruebas unitarias e integrales exhaustivas garantizando coberturas superiores al 85%.'
              ].map((resp, i) => (
                <li key={i} style={{ 
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#374151', fontSize: '0.9rem', 
                  fontWeight: 500, lineHeight: 1.5, padding: '0.75rem', borderRadius: '0.5rem', 
                  borderLeft: '3px solid transparent', transition: 'all 0.2s ease', cursor: 'default' 
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fdfbf7'; e.currentTarget.style.borderLeftColor = 'var(--flame)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent'; }}
                >
                  <Check size={18} color="#22c55e" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <span>{resp}</span>
                </li>
              ))}
            </ul>

          </div>

          {/* COLUMNA DERECHA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Detalles de la posición */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--oatmeal)', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'var(--flame)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = 'var(--oatmeal)'; }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#111827', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={18} color="#6b7280" /> Detalles de la posición
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                {/* CAJA 1: Fondo crema #f8f5f1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#f8f5f1', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #f0ebe1', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0ebe1'; e.currentTarget.style.borderColor = '#e5dfd3'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8f5f1'; e.currentTarget.style.borderColor = '#f0ebe1'; }}
                >
                  <Laptop size={18} color="#6b7280" />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Modalidad de trabajo</p>
                    <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: '0.85rem' }}>{vacante.modalidad}</p>
                  </div>
                </div>

                {/* CAJA 2: Fondo crema #f8f5f1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#f8f5f1', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #f0ebe1', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0ebe1'; e.currentTarget.style.borderColor = '#e5dfd3'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8f5f1'; e.currentTarget.style.borderColor = '#f0ebe1'; }}
                >
                  <BarChart2 size={18} color="#6b7280" />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Nivel de experiencia</p>
                    <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: '0.85rem' }}>{vacante.nivel_experiencia}</p>
                  </div>
                </div>

                {/* CAJA 3: Fondo crema #f8f5f1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#f8f5f1', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #f0ebe1', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0ebe1'; e.currentTarget.style.borderColor = '#e5dfd3'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8f5f1'; e.currentTarget.style.borderColor = '#f0ebe1'; }}
                >
                  <Calendar size={18} color="#6b7280" />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Fecha de publicación</p>
                    <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: '0.85rem' }}>{fechaPublicacion} ({estadoUI === 'ACTIVA' ? 'Activa' : estadoUI})</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Recomendaciones UMSSPIRA */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--oatmeal)', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'var(--flame)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = 'var(--oatmeal)'; }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lightbulb size={18} color="#b45309" /> Recomendaciones UMSSPIRA
              </h3>
              
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem', fontWeight: 500 }}>
                Mantener la oferta actualizada asegura que los egresados y estudiantes destacados de la UMSS apliquen oportunamente.
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: '#4b5563', fontWeight: 500, padding: '0.5rem', borderRadius: '0.4rem', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Check size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  Responde a los candidatos dentro de los primeros 5 días hábiles.
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: '#4b5563', fontWeight: 500, padding: '0.5rem', borderRadius: '0.4rem', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Check size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  Si la posición ya fue cubierta, recuerda cambiar el estado a <strong>Cerrada</strong>.
                </li>
              </ul>

              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', gap: '0.5rem', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef3c7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fffbeb'}
              >
                <Info size={16} color="#b45309" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#b45309', fontWeight: 500, lineHeight: 1.4 }}>
                  Puedes editar los requerimientos técnicos en cualquier momento sin perder los postulantes ya recibidos.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}