import type { Metadata } from 'next';
import Link from 'next/link';
import JobsListingView from '@/modules/job-postings/components/jobs-listing-view';
import RequirementsConsultation from '@/modules/job-postings/components/requirements-consultation';
import ModeControls from '@/modules/job-postings/components/mode-controls';
import OpportunitiesView from '@/modules/job-postings/components/opportunities-view';
import { DemoJobsPage } from '@/modules/job-postings/demo/demo-pages';
import { resolveDemoScenario, demoHref, type ModeSearchParams } from '@/modules/job-postings/demo/mode';

export const metadata: Metadata = { title: 'Bolsa de trabajo | UMSSPIRA' };

export default function JobPostingsPage({ searchParams }: { searchParams?: ModeSearchParams }) {
  const rawParam = searchParams?.hu8Demo || searchParams?.hu9Demo;
  const scenario = resolveDemoScenario(rawParam);

  const isOpportunities =
    scenario === 'oportunidades' ||
    searchParams?.tab === 'oportunidades' ||
    searchParams?.view === 'oportunidades';

  if (isOpportunities) {
    return (
      <main id="hu8-main" className="hu8-board-page">
        <div className="hu8-board-content">
          <ModeControls scenario={scenario ?? undefined} />
          <nav aria-label="Selector de vistas" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <Link
              href="/job-postings"
              className="hu8-board-button"
              style={{ minHeight: '38px', padding: '6px 14px', fontSize: '13px' }}
            >
              Listado general
            </Link>
            <Link
              href="/job-postings?tab=oportunidades"
              className="hu8-board-button"
              style={{
                minHeight: '38px',
                padding: '6px 14px',
                fontSize: '13px',
                background: '#ea580c',
                color: '#ffffff',
                borderColor: '#ea580c',
                fontWeight: 600,
              }}
            >
              Oportunidades para ti (HU9)
            </Link>
          </nav>
          <OpportunitiesView
            detailHref={(id) =>
              scenario
                ? demoHref(`/job-postings/${encodeURIComponent(id)}`, scenario)
                : `/job-postings/${encodeURIComponent(id)}`
            }
          />
        </div>
      </main>
    );
  }

  if (scenario) return <DemoJobsPage key={scenario} scenario={scenario} />;

  return (
    <JobsListingView
      controls={
        <div>
          <ModeControls />
          <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
            <span
              className="hu8-board-button"
              style={{
                minHeight: '38px',
                padding: '6px 14px',
                fontSize: '13px',
                background: '#192940',
                color: '#ffffff',
                borderColor: '#192940',
                fontWeight: 600,
              }}
            >
              Listado general
            </span>
            <Link
              href="/job-postings?tab=oportunidades"
              className="hu8-board-button"
              style={{ minHeight: '38px', padding: '6px 14px', fontSize: '13px' }}
            >
              Oportunidades para ti (HU9)
            </Link>
          </div>
        </div>
      }
      lookup={<RequirementsConsultation linkToDetail />}
    />
  );
}
