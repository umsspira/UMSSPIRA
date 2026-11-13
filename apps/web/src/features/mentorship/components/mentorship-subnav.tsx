'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Compass, Inbox, LayoutGrid, Send, UserRoundCog } from 'lucide-react';
import { useActiveMentorStatus } from '../hooks/use-active-mentor-status';

type SubnavItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  isCurrent: (pathname: string, showingSent: boolean) => boolean;
};

const baseItems: SubnavItem[] = [
  {
    href: '/mentorship',
    label: 'Inicio',
    icon: LayoutGrid,
    isCurrent: pathname => pathname === '/mentorship',
  },
  {
    href: '/mentorship/directory',
    label: 'Explorar mentores',
    icon: Compass,
    isCurrent: pathname => pathname === '/mentorship/directory'
      || pathname.startsWith('/mentorship/mentors/')
      || pathname.startsWith('/mentorship/request/'),
  },
  {
    href: '/mentorship/requests/received?view=sent',
    label: 'Mis solicitudes',
    icon: Send,
    isCurrent: (pathname, showingSent) => showingSent
      ? pathname === '/mentorship/requests/received'
      : pathname === '/mentorship/requests',
  },
];

const mentorItems: SubnavItem[] = [
  {
    href: '/mentorship/profile',
    label: 'Mi perfil de mentor',
    icon: UserRoundCog,
    isCurrent: pathname => pathname.startsWith('/mentorship/profile'),
  },
  {
    href: '/mentorship/requests/received',
    label: 'Solicitudes recibidas',
    icon: Inbox,
    isCurrent: (pathname, showingSent) => pathname === '/mentorship/requests/received' && !showingSent,
  },
];

export function MentorshipSubnav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showingSent = searchParams.get('view') === 'sent';
  const activeMentor = useActiveMentorStatus();
  // Las rutas exclusivas de mentor muestran sus opciones aunque la consulta
  // todavía esté en curso, para que siempre exista una pestaña activa visible.
  const mentorRoute = pathname.startsWith('/mentorship/profile') || pathname === '/mentorship/requests/received';
  const items = activeMentor || mentorRoute ? [...baseItems, ...mentorItems] : baseItems;

  return (
    <nav className="mentorship-subnav" aria-label="Navegación de mentorías">
      {items.map(item => {
        const Icon = item.icon;
        const isCurrent = item.isCurrent(pathname, showingSent);
        return (
          <Link key={item.label} href={item.href} aria-current={isCurrent ? 'page' : undefined}>
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
