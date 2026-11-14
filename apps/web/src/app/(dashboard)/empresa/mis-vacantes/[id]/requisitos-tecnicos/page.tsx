import { TechnicalRequirementsManager } from '@/modules/job-postings/frontend/components/technical-requirements-manager';

export default function TechnicalRequirementsPage({ params }: { params: { id: string } }) {
  return <TechnicalRequirementsManager vacancyId={params.id} />;
}
