"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Bell, Bookmark, Building2, ChevronDown, ChevronRight, CircleUserRound, Search, SlidersHorizontal } from "lucide-react";

type Requirement = { id: string; nombre: string; nivel?: string };
type Vacancy = { id: string; titulo: string; descripcion: string; empresa: string; ubicacion: string; modalidad: string; tipoContrato: string; fechaPublicacion: string; estado: string; requerimientosLaborales: Requirement[] };

// Datos de muestra: la API actual de HU4 indexa vacantes, pero aún no expone una consulta GET.
const VACANCIES: Vacancy[] = [
  { id: "VAC-2025-001", titulo: "Analista de Datos Junior", descripcion: "Apoyar en el análisis, interpretación y visualización de datos para generar información útil para la toma de decisiones. Se requiere manejo de SQL, Excel y herramientas de análisis.", empresa: "DataSolutions Bolivia", ubicacion: "Cochabamba, Bolivia", modalidad: "Híbrido", tipoContrato: "Tiempo completo", fechaPublicacion: "2025-10-28", estado: "Disponible", requerimientosLaborales: [{ id: "r1", nombre: "SQL", nivel: "Intermedio" }, { id: "r2", nombre: "Excel", nivel: "Intermedio" }, { id: "r3", nombre: "Python", nivel: "Básico" }, { id: "r4", nombre: "Power BI", nivel: "Básico" }] },
  { id: "VAC-2025-002", titulo: "Desarrollador Frontend", descripcion: "Desarrollo de interfaces web accesibles y adaptables, en coordinación con los equipos de diseño y backend.", empresa: "Nexo Digital", ubicacion: "Cochabamba, Bolivia", modalidad: "Remoto", tipoContrato: "Tiempo completo", fechaPublicacion: "2025-10-25", estado: "Disponible", requerimientosLaborales: [{ id: "r5", nombre: "React" }, { id: "r6", nombre: "TypeScript" }, { id: "r7", nombre: "CSS" }] },
  { id: "VAC-2025-003", titulo: "Asistente de Recursos Humanos", descripcion: "Apoyo en procesos de selección, organización de documentación y seguimiento de indicadores del área.", empresa: "Grupo Andino", ubicacion: "La Paz, Bolivia", modalidad: "Presencial", tipoContrato: "Medio tiempo", fechaPublicacion: "2025-10-21", estado: "Disponible", requerimientosLaborales: [{ id: "r8", nombre: "Comunicación" }, { id: "r9", nombre: "Excel" }, { id: "r10", nombre: "Organización" }] },
];

export default function JobPostingsPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Vacancy | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return term ? VACANCIES.filter(v => [v.titulo, v.empresa, v.descripcion, v.ubicacion, ...v.requerimientosLaborales.map(r => r.nombre)].join(" ").toLocaleLowerCase("es").includes(term)) : VACANCIES.slice(0, 1);
  }, [query]);

  return <div className="hu4-app">
    <nav className="topbar">
      <a className="brand" href="/"><span className="brand-mark">U</span><span>UMSS<span className="brand-gold">PIRA</span></span></a>
      <div className="top-links"><a href="#">Inicio</a><a href="#">Comunidad</a><a href="#">Mi perfil</a><a className="top-active" href="/job-postings">Bolsa de trabajo</a><a href="#">Vacantes</a><a href="#">Empresas</a></div>
      <div className="top-actions"><Search size={13}/><Bell size={13}/><span className="top-divider"/><CircleUserRound size={19}/><span className="user-label">Juan Pérez<small>Estudiante</small></span><ChevronDown size={11}/></div>
    </nav>
    <main className="hu4-main">
      <div className="hu4-breadcrumb"><span>Inicio</span><ChevronRight/><span>Bolsa de trabajo</span>{selected && <><ChevronRight/><span>Detalle de vacante</span></>}</div>
      {selected ? <>
        <header className="hu4-heading detail-title"><div><h1>{selected.titulo}</h1><p>Código: {selected.id} <span>·</span> {selected.empresa}</p></div></header>
        <section className="detail-panel">
          <div className="detail-top"><div><h2>Datos de la vacante</h2><p>{selected.empresa} <span>·</span> {selected.ubicacion} <span>·</span> {selected.modalidad}</p></div><span className="available">{selected.estado}</span></div>
          <div className="detail-info"><span>Identificador: <b>{selected.id}</b></span><span>Empresa: <b>{selected.empresa}</b></span><span>Tipo de contrato: <b>{selected.tipoContrato}</b></span></div>
          <div className="detail-requirements"><h3>Requisitos principales</h3><div className="tag-row">{selected.requerimientosLaborales.map((r,i)=><span className={`skill-tag skill-${i%2}`} key={r.id}>{r.nombre}{r.nivel ? ` · ${r.nivel}` : ""}</span>)}</div></div>
          <div className="detail-description"><h3>Descripción</h3><p>{selected.descripcion}</p></div>
          <button className="outline-btn back-bottom" onClick={() => setSelected(null)}><ArrowLeft/> Volver a resultados</button>
        </section>
      </> : <>
        <header className="hu4-heading"><h1>Vacantes disponibles</h1><p>Encuentra oportunidades laborales y conecta con empresas.</p></header>
        <section className="search-panel">
          <label htmlFor="vacancy-search">Buscar por palabra clave</label>
          <div className="search-line"><Search/><input id="vacancy-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cargo, empresa o habilidad"/><button aria-label="Filtros" onClick={()=>setShowFilters(!showFilters)}><SlidersHorizontal/></button></div>
          {showFilters && <p className="filter-hint">Puedes buscar por título, empresa o requisito laboral.</p>}
        </section>
        <section className="results-panel"><div className="results-title"><h2>Resultados</h2>{query && <span>{results.length} resultados</span>}</div>
          {results.length ? <div className="vacancy-results">{results.map(v=><article className="vacancy-tile" key={v.id}>
            <div className="tile-head"><div><h3>{v.titulo}</h3><p>{v.empresa} <span>·</span> Código: {v.id}</p></div><span className="available">{v.estado}</span></div>
            <p className="tile-description">{v.descripcion}</p>
            <div className="tile-skills"><span className="skill-caption">Requisitos laborales</span><div className="tag-row">{v.requerimientosLaborales.slice(0,4).map((r,i)=><span className={`skill-tag skill-${i%2}`} key={r.id}>{r.nombre}</span>)}</div></div>
            <div className="tile-footer"><span className="tile-meta">{v.modalidad} <span>·</span> {v.tipoContrato}</span><button className="outline-btn" onClick={()=>setSelected(v)}>Ver detalles <ChevronRight/></button></div>
          </article>)}</div> : <div className="empty-state"><h3>No encontramos vacantes</h3><p>Prueba con otra palabra clave o modifica tu búsqueda.</p><button className="outline-btn" onClick={()=>setQuery("")}>Limpiar búsqueda</button></div>}
        </section>
      </>}
    </main>
    <footer className="hu4-footer"><span>© UMSSPIRA · Universidad Mayor de San Simón</span><span>Ayuda&nbsp;&nbsp; · &nbsp;&nbsp;Privacidad</span></footer>
  </div>;
}
