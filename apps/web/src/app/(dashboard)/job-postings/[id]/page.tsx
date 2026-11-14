import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/modules/auth/frontend/services/route-access";
import { DemoJobDetail } from "@/modules/job-postings/demo/demo-pages";
import {
  resolveDemoScenario,
  type ModeSearchParams,
} from "@/modules/job-postings/demo/mode";
import { VacancyDetailClient } from "./vacancy-detail-client";

export const metadata: Metadata = { title: "Detalle de vacante | UMSSPIRA" };

export default function JobPostingDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: ModeSearchParams;
}) {
  const scenario = resolveDemoScenario(searchParams?.hu8Demo);
  if (scenario)
    return (
      <DemoJobDetail
        key={`${params.id}:${scenario}`}
        id={params.id}
        scenario={scenario}
      />
    );

  const isGraduate = cookies().get(ROLE_COOKIE)?.value === "titulado";
  return (
    <VacancyDetailClient
      key={params.id}
      id={params.id}
      isGraduate={isGraduate}
    />
  );
}
