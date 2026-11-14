import type { Metadata } from "next";
import { Suspense } from "react";
import { AcademicEducationEditRoute } from "@/components/academic-education/academic-education-form-view";

export const metadata: Metadata = {
  title: "Editar formación académica",
};

export default function EditAcademicEducationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="h-[36rem] animate-pulse rounded-2xl bg-zinc-100"
          aria-busy="true"
        />
      }
    >
      <AcademicEducationEditRoute params={params} />
    </Suspense>
  );
}
