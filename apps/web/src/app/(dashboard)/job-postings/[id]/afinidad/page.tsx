import type { Metadata } from 'next';
import AffinityComparisonView from '@/modules/job-postings/components/affinity-comparison-view';
import { getDemoVacancies } from '@/modules/job-postings/demo/fixtures';
import { getDemoAffinityResponse } from '@/modules/job-postings/demo/affinity-fixtures';
import { resolveDemoScenario, demoHref, type ModeSearchParams } from '@/modules/job-postings/demo/mode';

export const metadata: Metadata = {
  title: 'Resultados de afinidad | UMSSPIRA',
};

export default function AffinityComparisonPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: ModeSearchParams;
}) {
  const scenario = resolveDemoScenario(searchParams?.hu8Demo);

  const demoVacancy = getDemoVacancies(true).find(
    (v) => v.id.toLowerCase() === params.id.toLowerCase(),
  );

  const affinityResponse = getDemoAffinityResponse(params.id, scenario ?? undefined);

  const backHref = scenario
    ? demoHref(`/job-postings/${encodeURIComponent(params.id)}`, scenario)
    : `/job-postings/${encodeURIComponent(params.id)}`;

  return (
    <main id="hu8-main" className="hu8-board-page" style={{ padding: '36px 72px 64px' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        <AffinityComparisonView
          vacancyId={params.id}
          vacancyTitle={demoVacancy?.titulo ?? 'Desarrollador Frontend Junior'}
          vacancyCompany={demoVacancy?.empresa ?? 'TechSolutions S.A.'}
          vacancyLocation={
            demoVacancy
              ? `${demoVacancy.ubicacion} · ${demoVacancy.modalidad}`
              : 'Cochabamba · Remoto'
          }
          vacancyArea={
            demoVacancy
              ? `${demoVacancy.area} · Junior`
              : 'Desarrollo de software · Junior'
          }
          affinity={affinityResponse}
          backHref={backHref}
        />
      </div>
    </main>
  );
}
