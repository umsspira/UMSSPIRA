'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BriefcaseBusiness, ChevronDown, Info, Search, Sparkles, UserCheck } from 'lucide-react';
import {
  DEMO_GRADUATE_PROFILE,
  DEMO_OPPORTUNITIES,
  type OpportunityItem,
} from '../demo/affinity-fixtures';

export interface OpportunitiesViewProps {
  opportunities?: OpportunityItem[];
  profile?: typeof DEMO_GRADUATE_PROFILE;
  detailHref?: (id: string) => string;
}

export default function OpportunitiesView({
  opportunities = DEMO_OPPORTUNITIES,
  profile = DEMO_GRADUATE_PROFILE,
  detailHref = (id) => `/job-postings/${encodeURIComponent(id)}`,
}: OpportunitiesViewProps) {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [modalidad, setModalidad] = useState('');

  const filtered = opportunities.filter((item) => {
    const matchesSearch =
      !search ||
      item.titulo.toLowerCase().includes(search.toLowerCase()) ||
      item.empresa.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesArea = !area || item.area === area;
    const matchesModality = !modalidad || item.modalidad === modalidad;

    return matchesSearch && matchesArea && matchesModality;
  });

  return (
    <div className="affinity-page">
      <nav aria-label="Migas de pan" className="affinity-breadcrumbs">
        <span>Bolsa de trabajo</span>
        <span>/</span>
        <span>Oportunidades</span>
      </nav>

      <header className="hu8-board-heading" style={{ marginTop: 0, marginBottom: '24px' }}>
        <div className="hu8-board-identity">
          <span className="hu8-board-briefcase">
            <BriefcaseBusiness size={26} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div>
            <h1 className="hu8-board-title" style={{ fontSize: '32px' }}>
              Oportunidades para ti
            </h1>
            <p className="hu8-board-description">
              Compara tu perfil con cada vacante y encuentra dónde puedes aportar.
            </p>
          </div>
        </div>
      </header>

      {/* Barra de Búsqueda y Filtros */}
      <section aria-label="Búsqueda de oportunidades" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search
              size={16}
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '17px',
                left: '16px',
                color: '#71829a',
              }}
            />
            <input
              type="search"
              aria-label="Buscar oportunidades"
              placeholder="Buscar por título, habilidad o empresa"
              className="hu8-board-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ width: '180px', position: 'relative' }}>
            <ChevronDown
              size={16}
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '17px',
                right: '16px',
                color: '#71829a',
                pointerEvents: 'none',
              }}
            />
            <select
              aria-label="Filtrar por área"
              className="hu8-board-field"
              style={{ paddingLeft: '16px' }}
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              <option value="">Todas las áreas</option>
              <option value="Tecnología">Tecnología</option>
              <option value="Análisis de datos">Análisis de datos</option>
              <option value="Agronomía">Agronomía</option>
            </select>
          </div>

          <div style={{ width: '160px', position: 'relative' }}>
            <ChevronDown
              size={16}
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '17px',
                right: '16px',
                color: '#71829a',
                pointerEvents: 'none',
              }}
            />
            <select
              aria-label="Filtrar por modalidad"
              className="hu8-board-field"
              style={{ paddingLeft: '16px' }}
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value)}
            >
              <option value="">Modalidad</option>
              <option value="Remoto">Remoto</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Presencial">Presencial</option>
            </select>
          </div>

          <button
            type="button"
            className="hu8-board-button"
            style={{
              background: '#ea580c',
              borderColor: '#ea580c',
              color: '#ffffff',
              fontWeight: 600,
              padding: '0 24px',
            }}
          >
            Buscar
          </button>
        </div>
      </section>

      {/* Nota informativa superior (Mockup 1) */}
      <div role="note" className="affinity-notice-banner">
        <Info size={20} aria-hidden="true" />
        <div>
          <h2>Una orientación personalizada, no una decisión de selección</h2>
          <p style={{ margin: 0 }}>
            La afinidad de 0 a 100 % compara habilidades y requisitos con tu perfil actual. Puedes
            revisar cualquier vacante, incluso con una afinidad baja.
          </p>
        </div>
      </div>

      {/* Layout principal: Lista a la izquierda, Perfil a la derecha */}
      <div className="affinity-layout-grid">
        <main aria-label="Lista de oportunidades">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#192940' }}>
              {filtered.length} {filtered.length === 1 ? 'oportunidad' : 'oportunidades'}
            </span>
            <span style={{ fontSize: '13px', color: '#667085', cursor: 'pointer' }}>
              Mayor afinidad ↓
            </span>
          </div>

          {filtered.map((item) => (
            <article key={item.id} className="opportunity-card" aria-label={`Vacante: ${item.titulo}`}>
              <div className="opportunity-main">
                <h3 className="opportunity-title">{item.titulo}</h3>
                <p className="opportunity-company">
                  {item.empresa} · {item.ubicacion}
                </p>
                <p className="opportunity-meta">
                  {item.modalidad} · {item.nivel} · {item.area}
                </p>

                <div className="opportunity-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="opportunity-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="opportunity-date">{item.fechaActualizacion}</p>
                {item.notaExtra && (
                  <p className="opportunity-extra-note">{item.notaExtra}</p>
                )}
              </div>

              {/* Bloque de afinidad a la derecha */}
              <div className="opportunity-affinity-block">
                <div>
                  <div className="opportunity-score-row">
                    <span className="opportunity-score-value">{item.porcentaje} %</span>
                    <span className="opportunity-score-pill">Afinidad calculada</span>
                  </div>
                  <p className="opportunity-summary-text">{item.resumenAfinidad}</p>
                </div>

                <Link
                  href={detailHref(item.id)}
                  aria-label={`Ver detalle: ${item.titulo}`}
                  className="opportunity-action-btn"
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          ))}

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#667085', marginTop: '24px' }}>
            Mostrando {filtered.length} de {opportunities.length} oportunidades · Fin de los resultados
          </p>
        </main>

        {/* Panel lateral derecho: Tu perfil profesional */}
        <aside aria-label="Tu perfil profesional">
          <div className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">Tu perfil profesional</h2>
              <span className="profile-status-badge">{profile.estadoDatos}</span>
            </div>

            <h3 className="profile-user-name">{profile.nombre}</h3>
            <p className="profile-degree">{profile.carrera}</p>

            <div className="profile-skills-chips">
              {profile.habilidades.map((skill) => (
                <span key={skill} className="profile-skill-chip">
                  {skill}
                </span>
              ))}
            </div>

            <p className="profile-update-date">
              Perfil actualizado el {profile.fechaActualizacion}.
            </p>

            <button
              type="button"
              className="profile-update-btn"
              onClick={() => alert('Edición de perfil')}
            >
              Actualizar perfil
            </button>

            <p className="profile-footer-note">
              Si cambias tu perfil o los requisitos de una vacante, actualizaremos la afinidad.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
