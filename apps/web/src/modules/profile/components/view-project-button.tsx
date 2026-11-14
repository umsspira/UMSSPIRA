'use client';

import { useRef, useState } from 'react';

import { ProjectEmbedModal, type EmbeddedProject } from '@/modules/profile/components/project-embed-modal';

// Botón «Ver proyecto» de cada proyecto del resumen (HU-20); al cerrar, el foco vuelve a este botón
export function ViewProjectButton({ project }: { project: EmbeddedProject }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleClose() {
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-fantastic bg-white px-4 py-2 text-sm font-bold text-blue-fantastic transition hover:bg-palladian"
      >
        Ver proyecto
      </button>
      {isOpen && <ProjectEmbedModal project={project} onClose={handleClose} />}
    </>
  );
}
