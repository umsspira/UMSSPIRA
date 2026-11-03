'use client';

import { useState } from 'react';
import type { TechnicalVacancyRequirement } from '@umsspira/shared-types';

export default function JobPostingsPage() {
  const [vacancyId, setVacancyId] = useState('');
  const [requirements, setRequirements] = useState<TechnicalVacancyRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function consultarRequisitos() {
    if (!vacancyId.trim()) {
      setError('Ingresa el ID de una vacante.');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(false);
    setRequirements([]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${apiUrl}/job-postings/${encodeURIComponent(vacancyId.trim())}/requisitos`,
      );

      if (!response.ok) {
        throw new Error('No se pudieron consultar los requisitos técnicos.');
      }

      const data: { requisitos: TechnicalVacancyRequirement[] } =
        await response.json();

      setRequirements(data.requisitos);
      setSearched(true);
    } catch {
      setError('No se pudo conectar con el servidor. Verifica que el backend esté funcionando.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-2xl font-bold">
        Consultar requisitos técnicos de una vacante
      </h1>

      <p className="mb-6">
        Ingresa el identificador de la vacante para consultar sus requisitos técnicos.
      </p>

      <div className="mb-6 flex gap-3">
        <input
          className="w-full rounded border p-3"
          value={vacancyId}
          onChange={(event) => setVacancyId(event.target.value)}
          placeholder="ID de la vacante"
          aria-label="ID de la vacante"
        />
        <button
          className="rounded bg-blue-700 px-5 py-3 text-white disabled:opacity-50"
          onClick={consultarRequisitos}
          disabled={loading}
        >
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {error && <p role="alert" className="text-red-600">{error}</p>}

      {searched && requirements.length === 0 && (
        <p>No se encontraron requisitos técnicos para esta vacante.</p>
      )}

      {requirements.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Requisitos técnicos</h2>
          <ul className="space-y-3">
            {requirements.map((requirement) => (
              <li key={requirement.id} className="rounded border p-4">
                <p><strong>Competencia:</strong> {requirement.competencia}</p>
                <p><strong>Nivel:</strong> {requirement.nivel}</p>
                <p><strong>Tipo:</strong> {requirement.tipo}</p>
                {requirement.descripcion && (
                  <p><strong>Descripción:</strong> {requirement.descripcion}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
