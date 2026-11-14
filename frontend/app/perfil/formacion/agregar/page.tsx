import type { Metadata } from "next";
import { AcademicEducationFormView } from "@/components/academic-education/academic-education-form-view";

export const metadata: Metadata = {
  title: "Agregar formación académica",
};

export default function AddAcademicEducationPage() {
  return <AcademicEducationFormView mode="create" />;
}
