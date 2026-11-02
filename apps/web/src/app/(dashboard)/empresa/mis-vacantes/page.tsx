'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, FolderOpen, Search, Eye, Pencil, MoreVertical, 
  Pause, Trash2, Monitor, MapPin, BarChart2 
} from 'lucide-react';

interface Vacante {
  id: string;
  titulo: string;
  tecnologias: string;
  modalidad: string;
  nivel: string;
  estado: 'ACTIVA' | 'PAUSADA' | 'CERRADA' | 'BORRADOR';
  fecha_publicacion: string;
}

export default function MisVacantesPage() {
  const router = useRouter();
  
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Todas');
  
  // Lógica de Nicolás
  const [vacanteACerrar, setVacanteACerrar] = useState<Vacante | null>(null);
  const [isCerrando, setIsCerrando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  // Datos actualizados para que coincidan con el mockup
  useEffect(() => {
    const fetchVacantes = async () => {
      setIsLoading(true);
      try {
        const mockData: Vacante[] = [
          { id: '1', titulo: 'Desarrollador Backend', tecnologias: 'Python · Docker · REST APIs', modalidad: 'Remoto', nivel: 'Semi-Senior', estado: 'ACTIVA', fecha_publicacion: '10/09/2025' },
          { id: '2', titulo: 'Analista de Datos', tecnologias: 'SQL · Power BI · ETL', modalidad: 'Híbrido', nivel: 'Junior', estado: 'PAUSADA', fecha_publicacion: '08/09/2025' },
          { id: '3', titulo: 'QA Automation', tecnologias: 'Selenium · Java · CI/CD', modalidad: 'Presencial', nivel: 'Senior', estado: 'ACTIVA', fecha_publicacion: '05/09/2025' },
          { id: '4', titulo: 'Desarrollador Frontend', tecnologias: 'React · TypeScript · Tailwind', modalidad: 'Remoto', nivel: 'Junior', estado: 'ACTIVA', fecha_publicacion: '01/09/2025' },
          { id: '5', titulo: 'Ingeniero DevOps', tecnologias: 'AWS · Docker · Kubernetes', modalidad: 'Híbrido', nivel: 'Semi-Senior', estado: 'CERRADA', fecha_publicacion: '28/08/2025' },
          { id: '6', titulo: 'UI/UX Designer', tecnologias: 'Figma · Design System · UX Research', modalidad: 'Remoto', nivel: 'Junior', estado: 'BORRADOR', fecha_publicacion: '15/08/2025' },
        ];
        setVacantes(mockData);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVacantes();
  }, []);

  // Lógica de Nicolás
  const handleConfirmarCierre = async () => {
    if (!vacanteACerrar) return;
    setIsCerrando(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVacantes((prev) => 
        prev.map((v) => v.id === vacanteACerrar.id ? { ...v, estado: 'CERRADA' } : v)
      );
      setVacanteACerrar(null);
    } finally {
      setIsCerrando(false);
    }
  };

  const handleEditar = (id: string) => {
    router.push(`/job-postings?edit=${id}`);
  };

  const getBadgeStyle = (estado: string) => {
    // Convertimos todo a mayúsculas para que no falle si llega como "Pausada" o "pausada"
    const estadoNormalizado = estado?.toUpperCase() || 'BORRADOR'; 

    switch(estadoNormalizado) {
      case 'ACTIVA': 
        return { bg: '#dcfce7', color: '#166534' }; // Verde
      case 'PAUSADA': 
      case 'CERRADA': 
      case 'BORRADOR':
      default: 
        // Unificamos todos los estados inactivos en un gris oscuro/legible (CA-08)
        return { bg: '#f3f4f6', color: '#4b5563' }; 
    }
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando vacantes...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header del mockup */}
      <Link href="/empresa" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ink-70)', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <ArrowLeft size={16} /> Volver
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ padding: '0.5rem', backgroundColor: '#fff', border: '1px solid var(--flame)', borderRadius: '0.5rem', color: 'var(--flame)' }}>
          <FolderOpen size={24} />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--ink)', margin: 0 }}>Mis vacantes publicadas</h1>
      </div>

      {/* Filtros (Visuales por ahora) */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar por título" style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--oatmeal)', outline: 'none' }} />
        </div>
        {['Estado', 'Modalidad', 'Nivel de experiencia'].map(filtro => (
          <select key={filtro} style={{ padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--oatmeal)', backgroundColor: '#fff', color: 'var(--ink)' }}>
            <option>{filtro}</option>
          </select>
        ))}
      </div>

      {/* Tabs (Pestañas) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {['Todas (6)', 'Activas (4)', 'Pausadas (1)', 'Cerradas (1)', 'Borradores (0)'].map((tab) => {
          const isActive = activeTab === tab.split(' ')[0];
          return (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab.split(' ')[0])}
              style={{ 
                padding: '0.4rem 1rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
                backgroundColor: isActive ? '#2d3748' : '#fff', color: isActive ? '#fff' : 'var(--ink)',
                border: isActive ? 'none' : '1px solid var(--oatmeal)'
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tabla */}
      <div style={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--oatmeal)', overflow: 'hidden' }}>
        
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--oatmeal)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--ink-70)', textTransform: 'uppercase' }}>
          <div>Título</div>
          <div>Modalidad</div>
          <div>Nivel de experiencia</div>
          <div>Estado</div>
          <div>Fecha de publicación</div>
          <div style={{ textAlign: 'center' }}>Acciones</div>
        </div>

        {/* Table Body */}
        {vacantes.map((vacante, index) => {
          const badge = getBadgeStyle(vacante.estado);
          return (
            <div key={vacante.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: index !== vacantes.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center', fontSize: '0.875rem' }}>
              
              {/* Título y Tecnologías */}
              <div>
                <div style={{ fontWeight: 'bold', color: 'var(--ink)' }}>{vacante.titulo}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>{vacante.tecnologias}</div>
              </div>

              {/* Modalidad */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--ink-70)' }}>
                {vacante.modalidad === 'Remoto' ? <Monitor size={14} /> : <MapPin size={14} />} {vacante.modalidad}
              </div>

              {/* Nivel */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--ink-70)' }}>
                <BarChart2 size={14} /> {vacante.nivel}
              </div>

              {/* Estado (Badge) */}
              <div>
                <span style={{ backgroundColor: badge.bg, color: badge.color, padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {vacante.estado}
                </span>
              </div>

              {/* Fecha */}
              <div style={{ color: 'var(--ink-70)' }}>{vacante.fecha_publicacion}</div>

              {/* Acciones (Menú desplegable) */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', position: 'relative' }}>
                
                <button style={{ border: '1px solid #e5e7eb', background: 'none', padding: '0.4rem', borderRadius: '0.4rem', cursor: 'pointer', color: '#6b7280' }}>
                  <Eye size={16} />
                </button>
                
                <button onClick={() => handleEditar(vacante.id)} style={{ border: '1px solid #e5e7eb', background: 'none', padding: '0.4rem', borderRadius: '0.4rem', cursor: 'pointer', color: '#6b7280' }}>
                  <Pencil size={16} />
                </button>

                <button onClick={() => setMenuAbierto(menuAbierto === vacante.id ? null : vacante.id)} style={{ border: '1px solid #e5e7eb', background: menuAbierto === vacante.id ? '#f3f4f6' : 'none', padding: '0.4rem', borderRadius: '0.4rem', cursor: 'pointer', color: '#6b7280' }}>
                  <MoreVertical size={16} />
                </button>

                {/* Menú flotante idéntico al mockup */}
                {menuAbierto === vacante.id && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', backgroundColor: '#fff', border: '1px solid var(--oatmeal)', borderRadius: '0.5rem', padding: '0.5rem', width: '150px', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'none', border: 'none', width: '100%', cursor: 'pointer', fontSize: '0.8rem' }}><Eye size={14} /> Ver detalle</button>
                    <button onClick={() => handleEditar(vacante.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'none', border: 'none', width: '100%', cursor: 'pointer', fontSize: '0.8rem' }}><Pencil size={14} /> Editar</button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'none', border: 'none', width: '100%', cursor: 'pointer', fontSize: '0.8rem' }}><Pause size={14} /> Pausar</button>
                    <button onClick={() => setVacanteACerrar(vacante)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '0.3rem', width: '100%', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}><Trash2 size={14} /> Desactivar</button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'none', color: '#dc2626', border: 'none', width: '100%', cursor: 'pointer', fontSize: '0.8rem' }}><Trash2 size={14} /> Eliminar</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE CIERRE (Lógica de Nicolás) */}
      {vacanteACerrar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '1rem', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--ink)' }}>¿Cerrar vacante?</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--ink-70)' }}>
              Estás a punto de cerrar la vacante <strong>{vacanteACerrar.titulo}</strong>. Esta acción es irreversible.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setVacanteACerrar(null)} disabled={isCerrando} style={{ padding: '0.5rem 1rem', border: '1px solid var(--oatmeal)', backgroundColor: 'transparent', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleConfirmarCierre} disabled={isCerrando} style={{ padding: '0.5rem 1rem', border: 'none', backgroundColor: '#dc2626', color: '#fff', borderRadius: '0.5rem', cursor: isCerrando ? 'not-allowed' : 'pointer', opacity: isCerrando ? 0.7 : 1 }}>
                {isCerrando ? 'Cerrando...' : 'Sí, cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}