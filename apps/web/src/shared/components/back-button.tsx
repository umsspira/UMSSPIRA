import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { cn } from '../utils/cn';

type BackButtonProps = {
  label?: string;
  // Texto completo para lectores de pantalla, por ejemplo «Volver a Mis registros»
  ariaLabel?: string;
  href?: string;
  // Si viene, tiene prioridad sobre href: es la pantalla desde la que se llegó
  returnTo?: string;
  onClick?: () => void;
  className?: string;
};

// Mismo «Volver» en todas las pantallas del perfil (HU-11): texto legible y área táctil de 44 px
const BACK_BUTTON_CLASS =
  'inline-flex min-h-[44px] w-fit items-center gap-2 rounded-lg border border-blue-fantastic bg-white px-4 py-2 text-[15px] font-semibold text-blue-fantastic transition hover:bg-palladian focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-truffle-trouble';

export function BackButton({ label = 'Volver', ariaLabel, href, returnTo, onClick, className }: BackButtonProps) {
  const destination = returnTo ?? href;
  const content = (
    <>
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </>
  );

  if (destination) {
    return (
      <Link href={destination} onClick={onClick} aria-label={ariaLabel ?? label} className={cn(BACK_BUTTON_CLASS, className)}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel ?? label} className={cn(BACK_BUTTON_CLASS, className)}>
      {content}
    </button>
  );
}
