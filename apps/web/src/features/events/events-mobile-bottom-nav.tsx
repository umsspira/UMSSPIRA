import Link from 'next/link';
import { CalendarDays, Home, UserRound, Users } from 'lucide-react';

export function EventsMobileBottomNav() {
  return (
    <nav className="events-mobile-bottom-nav" aria-label="Navegación móvil inferior">
      <Link href="/portal"><Home size={19} aria-hidden="true" /><span>Inicio</span></Link>
      <Link href="/portal/eventos" aria-current="page"><CalendarDays size={19} aria-hidden="true" /><span>Eventos</span></Link>
      <Link href="/portal/comunidad"><Users size={19} aria-hidden="true" /><span>Comunidad</span></Link>
      <Link href="/profile"><UserRound size={19} aria-hidden="true" /><span>Mi perfil</span></Link>
    </nav>
  );
}
