'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  categories,
  levels,
  suggestedSkills,
  Skill,
} from './data';

const STORAGE_KEY = 'umsspira-skills';

// Temporalmente usamos una edad de ejemplo.
// Backend posteriormente podrá obtenerla del perfil real.
const PROFILE_AGE = 25;

type Props = {
  mode: 'create' | 'edit';
  initialSkill?: Skill;
  initialName?: string;
};

export default function SkillForm({
  mode,
  initialSkill,
  initialName,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialSkill?.name ?? initialName ?? '');
  const [category, setCategory] = useState(
    initialSkill?.category ?? ''
  );
  const [level, setLevel] = useState(
    initialSkill?.level ?? ''
  );
  const [years, setYears] = useState(
    initialSkill?.years?.toString() ?? ''
  );

  const [error, setError] = useState('');

  const selectSuggestion = (skill: string) => {
    setName(skill);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const cleanName = name.trim();

    // Nombre obligatorio
    if (!cleanName) {
      setError('El nombre de la habilidad es obligatorio.');
      return;
    }

    // Máximo 50 caracteres
    if (cleanName.length > 50) {
      setError(
        'El nombre de la habilidad no puede superar los 50 caracteres.'
      );
      return;
    }

    // Categoría obligatoria
    if (!category) {
      setError('Selecciona una categoría.');
      return;
    }

    // Nivel obligatorio
    if (!level) {
      setError('Selecciona un nivel de dominio.');
      return;
    }

    // Validación de años
    let parsedYears: number | null = null;

    if (years.trim() !== '') {
      if (!/^\d+$/.test(years)) {
        setError(
          'Los años de experiencia deben ser números enteros.'
        );
        return;
      }

      parsedYears = Number(years);

      if (parsedYears < 0 || parsedYears >= PROFILE_AGE) {
        setError(
          `Los años de experiencia deben ser mayores o iguales a 0 y menores a la edad del egresado (${PROFILE_AGE} años).`
        );
        return;
      }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    const skills: Skill[] = saved ? JSON.parse(saved) : [];

    // Evitar duplicados
    const duplicate = skills.some(
      (skill) =>
        skill.name.toLowerCase() === cleanName.toLowerCase() &&
        skill.id !== initialSkill?.id
    );

    if (duplicate) {
      setError(
        'Esta habilidad ya está registrada en tu perfil. Por favor, selecciona una diferente.'
      );
      return;
    }

    if (mode === 'create') {
      const newSkill: Skill = {
        id: `${cleanName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        name: cleanName,
        category,
        level,
        years: parsedYears,
      };

      const updated = [...skills, newSkill];

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );
    } else if (initialSkill) {
      const updated = skills.map((skill) =>
        skill.id === initialSkill.id
          ? {
              ...skill,
              name: cleanName,
              category,
              level,
              years: parsedYears,
            }
          : skill
      );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );
    }

    router.push('/skills');
  };

  return (
    <main className="min-h-screen bg-[#f1eee4] px-6 py-8">
      <div className="mx-auto max-w-6xl">

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Perfil de vinculación &gt; Mis habilidades &gt;{' '}
          {mode === 'create' ? 'Agregar' : 'Editar'}
        </p>

        <h1 className="mb-6 text-3xl font-bold text-gray-800">
          {mode === 'create'
            ? 'Agregar nueva habilidad'
            : 'Editar habilidad'}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="max-w-2xl rounded-lg bg-white p-6 shadow-sm"
        >
          {/* Nombre */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Nombre de la habilidad *
            </label>

            <input
              type="text"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. TypeScript, Node.js, Scrum"
              className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-orange-300 ${
               error && !name.trim()
                 ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-blue-50'
                }`}
            />

            <p className="mt-1 text-xs text-gray-400">
              {name.length}/50 caracteres
            </p>
          </div>

          {/* Categoría */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Categoría *
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="" className="bg-white text-gray-900">
                Selecciona una categoría
              </option>

              {categories.map((item) => (
                <option key={item} value={item} className="bg-white text-gray-900">
                   {item}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Nivel de dominio *
            </label>

            <div className="flex flex-wrap gap-2">
              {levels.map((item) => (
                <label
                  key={item}
                  className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${
                    level === item
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="level"
                    value={item}
                    checked={level === item}
                    onChange={() => setLevel(item)}
                    className="mr-2"
                  />

                  {item}
                </label>
              ))}
            </div>
          </div>

          {/* Experiencia */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Años de experiencia (Opcional)
            </label>

            <input
              type="number"
              min={0}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="Ej. 2"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
            />
          </div>

          {/* Sugerencias */}
          {mode === 'create' && (
            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Habilidades sugeridas
              </p>

              <div className="flex flex-wrap gap-2">
                {suggestedSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => selectSuggestion(skill)}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs text-gray-600 hover:bg-blue-100"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Link
              href="/skills"
              className="rounded-md border border-gray-400 px-4 py-2 text-sm"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-md bg-orange-400 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-500"
            >
              {mode === 'create'
                ? 'Guardar habilidad'
                : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}