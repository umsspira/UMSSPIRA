import Link from 'next/link';
import { JobPostingDetail } from '@/app/portal/empleos/_components/job-posting-detail';
import { JOB_POSTINGS_ROUTE } from '@/shared/routes/job-postings';

export default function FriendlyJobPostingDetailPage({
  searchParams,
}: {
  searchParams: { jobId?: string | string[] };
}) {
  const jobId = Array.isArray(searchParams.jobId) ? searchParams.jobId[0] : searchParams.jobId;
  if (!jobId) {
    return (
      <main className="min-h-screen bg-[#F5F2EA] px-4 py-16 text-center text-[#172238]">
        <h1 className="text-2xl font-bold">Selecciona una vacante para ver su detalle</h1>
        <Link href={JOB_POSTINGS_ROUTE} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#172238] px-5 font-semibold text-white">
          Volver a vacantes
        </Link>
      </main>
    );
  }
  return <JobPostingDetail key={jobId} id={jobId} backHref={JOB_POSTINGS_ROUTE} presentation="hu002" />;
}
