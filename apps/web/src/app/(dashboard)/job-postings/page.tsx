import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/modules/auth/frontend/services/route-access";
import { JobPostingsList } from "./job-postings-list";

export default function JobPostingsPage() {
  const isGraduate = cookies().get(ROLE_COOKIE)?.value === "titulado";
  return <JobPostingsList isGraduate={isGraduate} />;
}
