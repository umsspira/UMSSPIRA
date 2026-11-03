'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Award, BriefcaseBusiness, CalendarDays, CircleDot, Home, Menu, Star, UserRound } from 'lucide-react';
import { demoHref, resolveDemoScenario, type DemoScenario } from '../demo/mode';

function NavigationItems({ scenario }: { scenario: DemoScenario | null }) {
  return (
    <>
      <Link href="/" className="hu8-header-item"><Home size={17} aria-hidden="true" />Inicio</Link>
      <span aria-disabled="true" className="hu8-header-item" title="Sección no disponible"><CalendarDays size={17} aria-hidden="true" />Eventos</span>
      <Link href={scenario ? demoHref('/job-postings', scenario) : '/job-postings'} className="hu8-header-item hu8-header-active" aria-current="location"><BriefcaseBusiness size={17} aria-hidden="true" />Bolsa de trabajo</Link>
      <span aria-disabled="true" className="hu8-header-item" title="Sección no disponible"><Award size={17} aria-hidden="true" />Mentorías</span>
      <span aria-disabled="true" className="hu8-header-item" title="Sección no disponible"><Star size={17} aria-hidden="true" />Beneficios</span>
      <span aria-disabled="true" className="hu8-header-item" title="Sección no disponible"><CircleDot size={17} aria-hidden="true" />Comunidad</span>
    </>
  );
}

function HeaderView({ scenario }: { scenario: DemoScenario | null }) {
  return (
    <header className="hu8-header-header">
      <div className="hu8-header-inner">
        <Link href="/" aria-label="UMSSPIRA · Inicio" className="hu8-header-logo">
          <Image src="/hu8/logo.png" alt="UMSSPIRA" width={172} height={56} priority />
        </Link>
        <nav aria-label="Navegación principal" className="hu8-header-nav"><NavigationItems scenario={scenario} /></nav>
        <details className="hu8-header-mobile">
          <summary aria-label="Menú de navegación"><Menu size={24} aria-hidden="true" /></summary>
          <nav aria-label="Navegación principal móvil" className="hu8-header-mobileNav"><NavigationItems scenario={scenario} /></nav>
        </details>
        <span className="hu8-header-avatar" aria-label="Perfil no disponible" title="Perfil no disponible"><UserRound size={16} aria-hidden="true" /></span>
      </div>
    </header>
  );
}

function HeaderWithMode() {
  const searchParams = useSearchParams();
  return <HeaderView scenario={resolveDemoScenario(searchParams.get('hu8Demo'))} />;
}

export default function JobsHeader() {
  return <Suspense fallback={<HeaderView scenario={null} />}><HeaderWithMode /></Suspense>;
}
