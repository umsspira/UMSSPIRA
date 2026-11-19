import { JobPostingDetail } from '@/app/portal/empleos/_components/job-posting-detail';
import { JOB_POSTINGS_ROUTE } from '@/shared/routes/job-postings';

export default function JobPostingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <JobPostingDetail
      key={params.id}
      id={params.id}
      backHref={JOB_POSTINGS_ROUTE}
      presentation="hu002"
    />
  );
}
