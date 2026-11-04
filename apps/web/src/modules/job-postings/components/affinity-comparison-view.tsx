'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  HelpCircle,
  Info,
  Lightbulb,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { VacancyAffinityResponse } from '@umsspira/shared-types';
import AffinityCard from './affinity-card';
import {
  DEMO_COMPARISON_ROWS,
  DEMO_GRADUATE_PROFILE,
  type ComparisonRow,
} from '../demo/affinity-fixtures';

export interface AffinityComparisonViewProps {
  vacancyId: string;
  vacancyTitle?: string;
  vacancyCompany?: string;
  vacancyLocation?: string;
  vacancyArea?: string;
  affinity?: VacancyAffinityResponse | null;
  comparisonRows?: ComparisonRow[];
  skillsList?: string[];
  backHref?: string;
}

export default function AffinityComparisonView({
  vacancyId,
  vacancyTitle = 'Desarrollador Frontend Junior',
  vacancyCompany = 'TechSolutions S.A.',
  vacancyLocation = 'Cochabamba · Remoto',
  vacancyArea = 'Desarrollo de software · Junior',
  affinity,
  comparisonRows = DEMO_COMPARISON_ROWS,
  skillsList = DEMO_GRADUATE_PROFILE.habilidadesDetalle,
  backHref,
}: AffinityComparisonViewProps) {
  const returnUrl = backHref ?? `/job-postings/${encodeURIComponent(vacancyId)}`;

  const exactCount = comparisonRows.filter((r) => r.resultado === 'Exacta').length;
  const similarCount = comparisonRows.filter((r) => r.resultado === 'Similar - NLP').length;
  const missingCount = comparisonRows.filter((r) => r.resultado === 'No encontrada').length;

  return (
    <div className="affinity-page affinity-comparison-page">
      <Link href={returnUrl} className="affinity-back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a la oferta
      </Link>

      <header style={{ marginBottom: '24px' }}>
        <h1 className="affinity-comparison-title">Resultados de afinidad</h1>
        <p className="affinity-comparison-sub">
          Conoce cómo se relacionan tus habilidades con esta oportunidad.
        </p>
      </header>

      {/* Banner resumen de la vacante */}
      <section className="comparison-vacancy-banner" aria-label="Información de la vacante evaluada">
        <div className="briefcase-icon">
          <BriefcaseBusiness size={24} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div>
          <h2>{vacancyTitle}</h2>
          <p>
            {vacancyCompany} · {vacancyLocation}
          </p>
          <p style={{ marginTop: '2px', fontSize: '12px' }}>{vacancyArea}</p>
        </div>
      </section>

      {/* Layout de 2 columnas */}
      <div className="affinity-layout-grid">
        {/* Columna Principal / Izquierda */}
        <div>
          {/* Card: Tu perfil frente a los requisitos */}
          <section
            className="affinity-detail-card"
            style={{ marginBottom: '24px' }}
            aria-labelledby="comparison-table-title"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#ea580c" />
              <h2 id="comparison-table-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                Tu perfil frente a los requisitos
              </h2>
            </div>

            <p style={{ fontSize: '13px', color: '#667085', margin: '8px 0 16px' }}>
              Se comparan los {comparisonRows.length} requisitos de esta oferta. Un término similar
              es una señal semántica, no una certificación.
            </p>

            {/* Badges contadores resumen */}
            <div className="comparison-counters" aria-label="Resumen de coincidencias">
              <span className="counter-pill counter-exact">
                {exactCount} exactas
              </span>
              <span className="counter-pill counter-similar">
                {similarCount} similares - NLP
              </span>
              <span className="counter-pill counter-missing">
                {missingCount} no encontradas
              </span>
            </div>

            {/* Tabla Comparativa */}
            <div className="comparison-table-wrap">
              <table className="comparison-table" aria-label="Comparativa de habilidades">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '32%' }}>
                      Requisito de la oferta
                    </th>
                    <th scope="col" style={{ width: '44%' }}>
                      Habilidad de tu perfil
                    </th>
                    <th scope="col" style={{ width: '24%' }}>
                      Resultado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.requisito}>
                      <td>
                        <div className="comparison-skill-title">
                          {row.requisito}
                        </div>
                      </td>
                      <td>
                        <div className="comparison-skill-title">
                          {row.habilidadPerfil}
                        </div>
                        <div className="comparison-skill-subtitle">
                          {row.detallePerfil}
                        </div>
                      </td>
                      <td>
                        {row.resultado === 'Exacta' ? (
                          <span className="badge-match-exact">
                            <Check size={13} strokeWidth={3} />
                            Exacta
                          </span>
                        ) : row.resultado === 'Similar - NLP' ? (
                          <span className="badge-match-similar">
                            Similar - NLP
                          </span>
                        ) : (
                          <span className="badge-match-missing">
                            No encontrada
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ fontSize: '12px', color: '#667085', margin: '12px 0 0', fontStyle: 'italic' }}>
              *«No encontrada» significa que no hay evidencia en el perfil, no que carezcas de la
              habilidad.
            </p>
          </section>

          {/* Bloque inferior: Habilidades de tu perfil */}
          <section
            className="affinity-detail-card"
            aria-labelledby="user-skills-title"
          >
            <h2 id="user-skills-title" style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px' }}>
              Habilidades de tu perfil
            </h2>

            <div className="profile-skills-chips" style={{ marginBottom: '12px' }}>
              {skillsList.map((skill) => (
                <span key={skill} className="profile-skill-chip" style={{ fontSize: '13px' }}>
                  {skill}
                </span>
              ))}
            </div>

            <p style={{ fontSize: '12px', color: '#667085', margin: '0 0 16px' }}>
              CSS y SQL no se asocian directamente con otros requisitos de esta oferta.
            </p>

            <button
              type="button"
              className="affinity-compare-btn"
              style={{ width: 'auto', padding: '8px 18px' }}
              onClick={() => alert('Edición de habilidades')}
            >
              <UserRound size={15} />
              Actualizar habilidades
            </button>
          </section>
        </div>

        {/* Columna Derecha / Sidebar */}
        <aside aria-label="Detalles adicionales de afinidad">
          {/* Tarjeta de afinidad (86%) */}
          <AffinityCard
            vacancyId={vacancyId}
            affinity={affinity}
            comparisonHref="#"
            className="shadow-sm"
          />

          {/* Bloque: ¿Cómo se estima la afinidad? */}
          <section
            className="affinity-explain-card"
            aria-labelledby="how-it-works-title"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Lightbulb size={18} color="#ea580c" />
              <h2 id="how-it-works-title" style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                ¿Cómo se estima la afinidad?
              </h2>
            </div>

            <div className="affinity-explain-step">
              <span className="affinity-step-num">1</span>
              <div style={{ fontSize: '13px', lineHeight: '18px' }}>
                <strong>Se revisan los datos</strong>
                <p style={{ margin: '2px 0 0', color: '#667085' }}>
                  Habilidades de tu perfil y requisitos de la vacante.
                </p>
              </div>
            </div>

            <div className="affinity-explain-step">
              <span className="affinity-step-num">2</span>
              <div style={{ fontSize: '13px', lineHeight: '18px' }}>
                <strong>Se compara el significado</strong>
                <p style={{ margin: '2px 0 0', color: '#667085' }}>
                  NLP identifica coincidencias y términos similares.
                </p>
              </div>
            </div>

            <div className="affinity-explain-step">
              <span className="affinity-step-num">3</span>
              <div style={{ fontSize: '13px', lineHeight: '18px' }}>
                <strong>Se pondera la relevancia</strong>
                <p style={{ margin: '2px 0 0', color: '#667085' }}>
                  La importancia y la similitud de cada requisito influyen en la estimación.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#667085', margin: '14px 0 0', lineHeight: '17px' }}>
              No es una división simple de competencias encontradas. Estimación orientativa semántica
              ponderada. No garantiza la contratación.
            </p>
          </section>

          {/* Bloque: Tu siguiente paso */}
          <section
            className="affinity-nextstep-card"
            aria-labelledby="next-step-title"
          >
            <h2 id="next-step-title" style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 10px', color: '#9a3412' }}>
              Tu siguiente paso
            </h2>

            <p style={{ fontSize: '13px', color: '#431407', margin: '0 0 10px', lineHeight: '19px' }}>
              Revisa Tailwind CSS y Jest. Si ya los utilizas, añádelos a tus habilidades con
              información precisa.
            </p>

            <p style={{ fontSize: '12px', color: '#7c2d12', margin: '0 0 16px', lineHeight: '18px' }}>
              React y TypeScript tienen mayor relevancia para este puesto. Las omisiones no suman
              directamente al porcentaje.
            </p>

            <button
              type="button"
              className="affinity-apply-btn"
              onClick={() => alert('Postulación simulada a la oferta')}
            >
              Postular a la oferta
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
