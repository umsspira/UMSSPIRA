import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/modules/auth/frontend/services/route-access";
import { VacancyDetailClient } from "./vacancy-detail-client";

export default function JobPostingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const isGraduate = cookies().get(ROLE_COOKIE)?.value === "titulado";
  return <VacancyDetailClient id={params.id} isGraduate={isGraduate} />;
}
