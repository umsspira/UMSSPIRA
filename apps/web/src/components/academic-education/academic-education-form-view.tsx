"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAcademicEducation, useCarreras } from "@/hooks/use-academic-education";
import { toFormValues } from "@/lib/academic-education/form";
import type { AcademicEducationFormMode } from "@/components/academic-education/types";
import { AcademicEducationForm } from "./academic-education-form";
import { EDUCATION_CRUMB, PROFILE_CRUMB, PageHeading } from "./page-heading";

const LIST_PATH = "/perfil/formacion";

export function AcademicEducationEditRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AcademicEducationFormView mode="edit" idFormacion={id} />;
}

export function AcademicEducationFormView({
  mode,
  idFormacion,
}: {
  mode: AcademicEducationFormMode;
  idFormacion?: string;
}) {
  const router = useRouter();
  const {
    idEgresado,
    records,
    isLoading,
    error: recordsError,
    create,
    update,
  } = useAcademicEducation();
  const {
    carreras,
    isLoading: carrerasLoading,
    error: carrerasError,
  } = useCarreras();
  const isEdit = mode === "edit";
  const record = isEdit
    ? records.find((item) => item.idFormacion === idFormacion)
    : undefined;

  const heading = (
    <PageHeading
      crumbs={[
        PROFILE_CRUMB,
        EDUCATION_CRUMB,
        { label: isEdit ? "Editar" : "Agregar" },
      ]}
      title={isEdit ? "Editar formación académica" : "Agregar formación académica"}
      description={
        isEdit
          ? "Actualiza la información de tu formación académica."
          : "Completa los datos de tu formación. Los campos marcados con * son obligatorios."
      }
    />
  );

  if (isLoading || carrerasLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        {heading}
        <div
          className="h-[36rem] animate-pulse rounded-2xl bg-zinc-100"
          aria-busy="true"
        />
      </main>
    );
  }

  if (recordsError || carrerasError) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        {heading}
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          No se pudieron cargar los datos de formación académica. Inténtalo nuevamente.
        </p>
      </main>
    );
  }

  if (isEdit && !record) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        {heading}
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <p className="font-medium text-zinc-900">
            No encontramos esta formación académica.
          </p>
          <Link
            href={LIST_PATH}
            className="mt-3 inline-block text-sm font-medium text-orange-600 hover:underline"
          >
            Volver a Mi formación académica
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      {heading}
      <AcademicEducationForm
        key={record?.idFormacion ?? "new"}
        mode={mode}
        idEgresado={idEgresado}
        carreras={carreras}
        initialValues={record ? toFormValues(record) : undefined}
        onCancel={() => router.push(LIST_PATH)}
        onSubmit={async (payload) => {
          if (record) await update(record.idFormacion, payload);
          else await create(payload);
          router.push(LIST_PATH);
        }}
      />
    </main>
  );
}
