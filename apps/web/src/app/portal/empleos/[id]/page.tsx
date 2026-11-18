import { JobPostingDetail } from '../_components/job-posting-detail';

export default function AvailableJobPostingPage({
  params,
}: {
  params: { id: string };
}) {
  return <JobPostingDetail id={params.id} />;
}
