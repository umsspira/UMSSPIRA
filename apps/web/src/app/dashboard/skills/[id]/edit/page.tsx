'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SkillForm from '../../SkillForm';
import { Skill } from '../../data';

const STORAGE_KEY = 'umsspira-skills';

function EditSkillPageContent() {
  const params = useParams();
  const id = params.id as string;

  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const skills: Skill[] = JSON.parse(saved);

      const found = skills.find(
        (item) => item.id === id
      );

      setSkill(found ?? null);
    }

    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f1eee4] p-8">
        Cargando...
      </main>
    );
  }

  if (!skill) {
    return (
      <main className="min-h-screen bg-[#f1eee4] p-8">
        <h1 className="text-2xl font-bold text-red-600">
          Habilidad no encontrada
        </h1>
      </main>
    );
  }

  return (
    <SkillForm
      mode="edit"
      initialSkill={skill}
    />
  );
}

export default function EditSkillPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f1eee4] p-8">Cargando...</main>}>
      <EditSkillPageContent />
    </Suspense>
  );
}