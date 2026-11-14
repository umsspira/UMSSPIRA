"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownWideNarrow, Check, ChevronDown, Search, X } from "lucide-react";
import { listJobPostings, type JobPosting } from "@/shared/services/job-postings";
import { authStore, useAuthStore } from "@/modules/auth/frontend/store/auth.store";
import { getCurrentUser } from "@/modules/auth/frontend/services/auth.service";

type ListState =
  | { kind: "loading" }
  | { kind: "loaded"; postings: JobPosting[] }
  | { kind: "error" };

const EMPTY_POSTINGS: JobPosting[] = [];

function postingsHaveAffinity(state: ListState): boolean {
  return state.kind === "loaded" && state.postings.some((posting) => typeof posting.affinityPercentage === "number");
}

function relativePublicationDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "Hoy";
  if (days === 1) return "Hace 1 día";
  if (days < 7) return `Hace ${days} días`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "Hace 1 semana" : `Hace ${weeks} semanas`;
}

function AffinityBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"><span aria-hidden="true">●</span>Sin calcular</span>;
  }
  const tone = value === 0
    ? "border-amber-300 bg-amber-50 text-amber-800"
    : value >= 80
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : value >= 50
        ? "border-blue-300 bg-blue-50 text-blue-800"
        : "border-slate-300 bg-slate-100 text-slate-700";
  return <span className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${tone}`}><span aria-hidden="true">●</span>{value}% Afinidad</span>;
}

export function JobPostingsList() {
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("all");
  const [modality, setModality] = useState("all");
  const [affinityGroup, setAffinityGroup] = useState("all");
  const [affinityOrder, setAffinityOrder] = useState<"desc" | "asc">("desc");
  const role = useAuthStore().role;
  const showAffinity = role === "titulado" || postingsHaveAffinity(state);

  useEffect(() => {
    if (role) return;
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (active) authStore.setState({ role: user.role, status: "authenticated" });
      })
      .catch(() => {
        // La carga del listado sigue siendo independiente de la consulta de sesión.
      });
    return () => { active = false; };
  }, [role]);

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });
    listJobPostings()
      .then((postings) => { if (active) setState({ kind: "loaded", postings }); })
      .catch((error: unknown) => {
        if (active) {
          console.error("No se pudieron cargar las vacantes", error);
          setState({ kind: "error" });
        }
      });
    return () => { active = false; };
  }, [attempt]);

  const postings = state.kind === "loaded" ? state.postings : EMPTY_POSTINGS;
  const areas = useMemo(() => Array.from(new Set(postings.flatMap((posting) => posting.technicalRequirements.map((requirement) => requirement.name)))).sort((a, b) => a.localeCompare(b)), [postings]);
  const modalities = useMemo(() => Array.from(new Set(postings.map((posting) => posting.modality).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b)), [postings]);
  const filteredPostings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matches = postings.filter((posting) => {
      const searchable = [posting.title, posting.technicalDescription, posting.company?.name].filter(Boolean).join(" ").toLocaleLowerCase();
      const affinity = posting.affinityPercentage;
      return (!query || searchable.includes(query))
        && (area === "all" || posting.technicalRequirements.some((requirement) => requirement.name === area))
        && (modality === "all" || posting.modality === modality)
        && (affinityGroup === "all"
          || (affinity !== null && affinity !== undefined && (affinityGroup === "recommended" ? affinity > 50 : affinity <= 50)));
    });
    return matches.sort((left, right) => {
      const leftValue = left.affinityPercentage;
      const rightValue = right.affinityPercentage;
      if (leftValue === null || leftValue === undefined) return rightValue === null || rightValue === undefined ? 0 : 1;
      if (rightValue === null || rightValue === undefined) return -1;
      return affinityOrder === "desc" ? rightValue - leftValue : leftValue - rightValue;
    });
  }, [postings, search, area, modality, affinityGroup, affinityOrder]);
  const hasFilters = Boolean(search || area !== "all" || modality !== "all" || affinityGroup !== "all");

  function clearFilters() {
    setSearch("");
    setArea("all");
    setModality("all");
    setAffinityGroup("all");
    setAffinityOrder("desc");
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-7rem)] w-full max-w-[1600px] bg-[#f7f6f1] px-4 py-8 text-[#111a2e] sm:px-6 lg:px-8">
      <nav aria-label="Ruta de navegación" className="mb-5 text-sm text-slate-500">Inicio <span className="mx-2 text-slate-400">›</span> <span className="font-semibold text-slate-800">Vacantes disponibles</span></nav>
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Bolsa de trabajo</h1>
        <p className="mt-3 max-w-4xl text-lg text-slate-600">Explora y encuentra oportunidades laborales adaptadas a tu perfil académico y profesional con cálculo automático de afinidad.</p>
      </header>

      <section aria-label="Buscar y filtrar vacantes" className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(250px,2fr)_minmax(170px,1fr)_minmax(170px,1fr)_auto]">
          <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 text-slate-400">
            <Search aria-hidden="true" size={20} />
            <span className="sr-only">Buscar por cargo, palabra clave o empresa</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por cargo, palabra clave o empresa..." className="min-w-0 flex-1 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400" />
          </label>
          <label className="relative flex h-12 items-center rounded-xl border border-slate-300 bg-slate-50 px-4">
            <span className="sr-only">Filtrar por área laboral</span>
            <select value={area} onChange={(event) => setArea(event.target.value)} className="w-full appearance-none bg-transparent pr-7 text-base text-slate-700 outline-none"><option value="all">Todas las áreas</option>{areas.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 text-slate-500" size={18} />
          </label>
          <label className="relative flex h-12 items-center rounded-xl border border-slate-300 bg-slate-50 px-4">
            <span className="sr-only">Filtrar por modalidad</span>
            <select value={modality} onChange={(event) => setModality(event.target.value)} className="w-full appearance-none bg-transparent pr-7 text-base text-slate-700 outline-none"><option value="all">Modalidad: Todas</option>{modalities.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 text-slate-500" size={18} />
          </label>
          {showAffinity ? <label className="relative flex h-12 items-center rounded-xl border border-orange-200 bg-orange-50 px-4">
            <span className="sr-only">Ordenar por afinidad</span>
            <select value={affinityOrder} onChange={(event) => setAffinityOrder(event.target.value as "desc" | "asc")} className="w-full appearance-none bg-transparent pr-7 text-sm font-semibold text-orange-950 outline-none"><option value="desc">Mayor afinidad</option><option value="asc">Menor afinidad</option></select><ArrowDownWideNarrow aria-hidden="true" className="pointer-events-none absolute right-3 text-orange-700" size={18} />
          </label> : <div className="flex h-12 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 font-semibold text-orange-900"><ArrowDownWideNarrow aria-hidden="true" size={18} />Vacantes disponibles</div>}
        </div>
        {showAffinity && <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div role="group" aria-label="Filtrar por afinidad" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-slate-600">Afinidad:</span>
            {[
              ["all", "Todas"],
              ["recommended", "Recomendadas"],
              ["not-recommended", "No recomendadas"],
            ].map(([value, label]) => <button key={value} type="button" aria-pressed={affinityGroup === value} onClick={() => setAffinityGroup(value)} className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${affinityGroup === value ? "border-orange-300 bg-orange-100 text-orange-950" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-900"}`}>{label}</button>)}
          </div>
          {affinityGroup !== "all" && <p className="text-sm text-slate-500">{affinityGroup === "recommended" ? "Solo vacantes con afinidad mayor al 50 %." : "Solo vacantes con afinidad igual o menor al 50 %."}</p>}
        </div>}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-4 text-sm">
          {state.kind === "loaded" && <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-700">{filteredPostings.length} {filteredPostings.length === 1 ? "vacante encontrada" : "vacantes encontradas"}</span>}
          {showAffinity && state.kind === "loaded" && <span role="status" className="inline-flex items-center gap-2 text-emerald-700"><Check aria-hidden="true" size={18} className="rounded-full bg-emerald-600 p-0.5 text-white" />{affinityOrder === "asc" ? "Ordenado de menor a mayor afinidad" : "Ordenado automáticamente según afinidad con tu perfil"}</span>}
          {hasFilters && <button type="button" onClick={clearFilters} className="ml-auto inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"><X aria-hidden="true" size={17} />Limpiar filtros</button>}
        </div>
      </section>

      {state.kind === "loading" && <p role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Cargando vacantes...</p>}
      {state.kind === "error" && <section className="rounded-xl border border-slate-200 bg-white p-8 text-center"><p className="text-lg font-semibold">No pudimos cargar las vacantes</p><p className="mt-2 text-slate-600">Ocurrió un problema al consultar las ofertas disponibles.</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-5 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Reintentar</button></section>}
      {state.kind === "loaded" && filteredPostings.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">{postings.length ? "No hay vacantes que coincidan con los filtros." : "No hay vacantes disponibles en este momento."}</p>}

      {state.kind === "loaded" && filteredPostings.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr>
                <th scope="col" className="px-4 py-5 font-semibold">Vacante</th>
                <th scope="col" className="px-4 py-5 font-semibold">Empresa</th>
                {showAffinity && <th scope="col" aria-sort={affinityOrder === "desc" ? "descending" : "ascending"} className="border-x border-orange-100 bg-orange-50/60 px-4 py-5 font-semibold text-orange-950">Afinidad <span aria-hidden="true" className="ml-1 text-orange-600">⌄</span></th>}
                <th scope="col" className="px-4 py-5 font-semibold">Descripción breve</th>
                <th scope="col" className="px-4 py-5 font-semibold">Área laboral</th>
                <th scope="col" className="px-4 py-5 font-semibold">Modalidad</th>
                <th scope="col" className="px-4 py-5 font-semibold">Publicación</th>
                <th scope="col" className="px-4 py-5 text-right font-semibold">Acción</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPostings.map((posting) => (
                  <tr key={posting.id} className="hover:bg-slate-50/70">
                    <td className="max-w-56 px-4 py-5"><p className="text-base font-bold text-slate-900">{posting.title ?? "Vacante sin título"}</p></td>
                    <td className="px-4 py-5 text-slate-800">{posting.company?.name ?? "Empresa no especificada"}</td>
                    {showAffinity && <td className="border-x border-orange-100 bg-orange-50/20 px-4 py-5"><AffinityBadge value={posting.affinityPercentage} /></td>}
                    <td className="max-w-72 px-4 py-5 leading-6 text-slate-600"><p className="line-clamp-4">{posting.technicalDescription ?? "La empresa no registró una descripción."}</p></td>
                    <td className="px-4 py-5 text-slate-600">{posting.technicalRequirements.map((requirement) => requirement.name).filter((name, index, all) => all.indexOf(name) === index).join(", ") || "—"}</td>
                    <td className="px-4 py-5 text-slate-600">{posting.modality ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-5 text-slate-500">{relativePublicationDate(posting.publishedAt)}</td>
                    <td className="px-4 py-5 text-right"><Link href={`/job-postings/${encodeURIComponent(posting.id)}`} className="inline-flex whitespace-nowrap rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:border-orange-300 hover:text-orange-800">Ver oferta</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
