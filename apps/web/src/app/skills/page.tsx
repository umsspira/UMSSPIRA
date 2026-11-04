'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { initialSkills, Skill } from './data';

const STORAGE_KEY = 'umsspira-skills';

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [deleteSkill, setDeleteSkill] = useState<Skill | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      setSkills(JSON.parse(saved));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialSkills));
    }
  }, []);

  const confirmDelete = () => {
    if (!deleteSkill) return;

    const updated = skills.filter(
      (skill) => skill.id !== deleteSkill.id
    );

    setSkills(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setDeleteSkill(null);
  };

  return (
    <main className="min-h-screen bg-[#f1eee4] px-6 py-8">
      <div className="mx-auto max-w-6xl">

        {/* Encabezado */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Perfil de vinculación &gt; Mis habilidades
            </p>

            <h1 className="text-3xl font-bold text-gray-800">
              Mis habilidades
            </h1>

            <p className="mt-2 max-w-md text-sm text-gray-600">
              Gestiona tus habilidades técnicas y profesionales para mejorar
              tu compatibilidad con las vacantes disponibles.
            </p>
          </div>

          <Link
            href="/skills/new"
            className="rounded-md bg-orange-400 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500"
          >
            + Agregar habilidad
          </Link>
        </div>

        {/* Habilidades */}
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-gray-700">
            Habilidades registradas en tu perfil ({skills.length})
          </h2>

          <div className="flex flex-wrap gap-4">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="flex min-w-[160px] items-start justify-between rounded-md border border-gray-200 bg-[#f8f9fc] px-4 py-3"
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {skill.name}
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    {skill.category} • {skill.level}
                  </p>
                </div>

                <div className="ml-3 flex gap-2">
                  <Link
                    href={`/skills/${skill.id}/edit`}
                    className="text-xs text-gray-500 hover:text-gray-800"
                    title="Editar"
                  >
                    ✎
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDeleteSkill(skill)}
                    className="text-xs text-gray-500 hover:text-red-500"
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {skills.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No tienes habilidades registradas.
            </p>
          )}
        </section>

        {/* Información */}
        <div className="mt-5 rounded-md bg-blue-50 px-5 py-4 text-sm text-gray-600">
          <span className="mr-2">ⓘ</span>
          Tus habilidades son utilizadas por el sistema de matching para
          encontrar vacantes compatibles con tu perfil.
        </div>
      </div>

      {/* Modal eliminar */}
      {deleteSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">

            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                ⚠️ Eliminar habilidad
              </h2>

              <button
                type="button"
                onClick={() => setDeleteSkill(null)}
                className="text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
            </div>

            <p className="mb-6 text-sm text-gray-600">
              ¿Estás seguro de que deseas eliminar la habilidad{' '}
              <strong>{deleteSkill.name}</strong> de tu perfil?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteSkill(null)}
                className="rounded-md border border-gray-400 px-4 py-2 text-sm"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}