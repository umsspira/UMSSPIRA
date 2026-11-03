import type { Metadata } from 'next';
import JobPostingDetail from '@/modules/job-postings/components/job-posting-detail';
import { DemoJobDetail } from '@/modules/job-postings/demo/demo-pages';
import { resolveDemoScenario, type ModeSearchParams } from '@/modules/job-postings/demo/mode';

export const metadata: Metadata = { title: 'Detalle de vacante | UMSSPIRA' };

export default function JobPostingDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: ModeSearchParams }) {
  const scenario = resolveDemoScenario(searchParams?.hu8Demo);
  return scenario
    ? <DemoJobDetail key={`${params.id}:${scenario}`} id={params.id} scenario={scenario} />
    : <JobPostingDetail key={params.id} id={params.id} />;
}
