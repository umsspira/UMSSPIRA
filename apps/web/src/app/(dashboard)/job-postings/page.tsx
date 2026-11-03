import type { Metadata } from 'next';
import JobsListingView from '@/modules/job-postings/components/jobs-listing-view';
import RequirementsConsultation from '@/modules/job-postings/components/requirements-consultation';
import ModeControls from '@/modules/job-postings/components/mode-controls';
import { DemoJobsPage } from '@/modules/job-postings/demo/demo-pages';
import { resolveDemoScenario, type ModeSearchParams } from '@/modules/job-postings/demo/mode';

export const metadata: Metadata = { title: 'Bolsa de trabajo | UMSSPIRA' };

export default function JobPostingsPage({ searchParams }: { searchParams?: ModeSearchParams }) {
  const scenario = resolveDemoScenario(searchParams?.hu8Demo);
  if (scenario) return <DemoJobsPage key={scenario} scenario={scenario} />;
  return <JobsListingView controls={<ModeControls />} lookup={<RequirementsConsultation linkToDetail />} />;
}
