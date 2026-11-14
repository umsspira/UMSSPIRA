import type { Metadata } from "next";
import { AcademicEducationList } from "@/components/academic-education/academic-education-list";

export const metadata: Metadata = {
  title: "Mi formación académica",
};

export default function AcademicEducationPage() {
  return <AcademicEducationList />;
}
