import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/modules/auth/frontend/services/route-access";
import JobsListingView from "@/modules/job-postings/components/jobs-listing-view";
import RequirementsConsultation from "@/modules/job-postings/components/requirements-consultation";
import ModeControls from "@/modules/job-postings/components/mode-controls";
import { DemoJobsPage } from "@/modules/job-postings/demo/demo-pages";
import {
  resolveDemoScenario,
  type ModeSearchParams,
} from "@/modules/job-postings/demo/mode";
import { JobPostingsList } from "./job-postings-list";

export const metadata: Metadata = { title: "Bolsa de trabajo | UMSSPIRA" };

export default function JobPostingsPage({
  searchParams,
}: { searchParams?: ModeSearchParams } = {}) {
  const scenario = resolveDemoScenario(searchParams?.hu8Demo);
  if (scenario) return <DemoJobsPage key={scenario} scenario={scenario} />;

  const isGraduate = cookies().get(ROLE_COOKIE)?.value === "titulado";
  return (
    <JobsListingView
      controls={<ModeControls />}
      lookup={<RequirementsConsultation linkToDetail />}
    >
      <JobPostingsList isGraduate={isGraduate} />
    </JobsListingView>
  );
}
