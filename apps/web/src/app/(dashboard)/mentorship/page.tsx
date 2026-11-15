import Image from 'next/image';
import { CompassIcon } from 'lucide-react';
import { ExploreCard } from '@/features/mentorship/components/explore-card';
import { MentorEntryCard } from '@/features/mentorship/components/mentor-entry-card';

export default function MentoriasPage() {
  return (
    <main className="mentorship-shell">
      <section aria-labelledby="mentorship-title" className="mentorship-hero">
        <Image src="/mentorship-cover.jpg" alt="" fill priority sizes="(max-width: 1152px) 100vw, 1152px" className="mentorship-cover" />
        <div aria-hidden="true" className="mentorship-overlay" />
        <div className="mentorship-hero-content">
        <p className="mentorship-eyebrow">
          <span aria-hidden="true" className="mentorship-eyebrow-dot" />
          Red universitaria de desarrollo
        </p>
        <h1 id="mentorship-title" className="mentorship-title">
          Mentorías
        </h1>
        <p className="mentorship-quote">“Aprende de quienes ya recorrieron el camino”</p>
        <p className="mentorship-intro">
          Conecta con profesionales de la comunidad UMSS, aprende de su experiencia o comparte la tuya.
        </p>
        </div>
      </section>

      <div className="mentorship-cards">
        <ExploreCard icon={CompassIcon} />

        <MentorEntryCard />
      </div>
    </main>
  );
}
