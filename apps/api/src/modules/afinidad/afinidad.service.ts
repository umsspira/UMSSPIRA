import { Injectable, NotFoundException } from '@nestjs/common';

const OFERTAS = [
  { id: 1, titulo: 'Desarrollador Frontend Junior', empresa: 'TechSolutions S.A.', ciudad: 'Cochabamba', modalidad: 'Remoto', nivel: 'Junior', area: 'Tecnología', skills: ['React', 'TypeScript', 'Git', 'API REST'], afinidad: 86, resumen: '4 habilidades coincidentes y 1 similitud relevante', actualizado: '19 oct 2026 · 10:42' },
  { id: 2, titulo: 'Desarrollador Backend', empresa: 'TechSolutions S.A.', ciudad: 'Cochabamba', modalidad: 'Remoto', nivel: 'Junior', area: 'Tecnología', skills: ['Python', 'Docker', 'API REST'], afinidad: 64, resumen: 'Coincides en API REST, Git y trabajo en equipo', actualizado: '19 oct 2026 · 09:42' },
  { id: 3, titulo: 'Analista de Datos', empresa: 'Andina Digital', ciudad: 'Cochabamba', modalidad: 'Híbrido', nivel: 'Junior', area: 'Análisis de datos', skills: ['SQL', 'Power BI', 'ETL'], afinidad: 32, resumen: 'Tu experiencia con SQL aporta a esta vacante', actualizado: '19 oct 2026 · 09:42' },
  { id: 4, titulo: 'Ingeniero Agrónomo', empresa: 'Agrovalle S.R.L.', ciudad: 'Cochabamba', modalidad: 'Presencial', nivel: 'Junior', area: 'Agronomía', skills: ['Riego', 'Suelos', 'Manejo de cultivos'], afinidad: 0, resumen: 'Datos suficientes; no se identificaron coincidencias', actualizado: '19 oct 2026 · 09:42' },
];

const RESULTADOS = [
  { requisito: 'React', habilidad: 'React', tipo: 'exacta', detalle: 'Mismo término en tu perfil.' },
  { requisito: 'TypeScript', habilidad: 'TypeScript', tipo: 'exacta', detalle: 'Mismo término en tu perfil.' },
  { requisito: 'Git', habilidad: 'Git', tipo: 'exacta', detalle: 'Mismo término en tu perfil.' },
  { requisito: 'Diseño responsive', habilidad: 'Diseño web adaptable', tipo: 'similar', detalle: 'NLP detecta cercanía de significado.' },
  { requisito: 'Consumo de API REST', habilidad: 'Integración de servicios web', tipo: 'similar', detalle: 'Relación semántica; no acredita dominio equivalente.' },
  { requisito: 'Tailwind CSS', habilidad: null, tipo: 'no_encontrada', detalle: 'CSS no acredita el uso de Tailwind CSS.' },
  { requisito: 'Jest (deseable)', habilidad: null, tipo: 'no_encontrada', detalle: 'No se encontró esta competencia.' },
];

@Injectable()
export class AfinidadService {
  listar() {
    return [...OFERTAS].sort((a, b) => b.afinidad - a.afinidad);
  }
  detalle(id: number) {
    const oferta = OFERTAS.find((o) => o.id === id);
    if (!oferta) throw new NotFoundException('Oferta no encontrada');
    return oferta;
  }
  resultados(id: number) {
    const oferta = this.detalle(id);
    return { oferta, requisitos: id === 1 ? RESULTADOS : [], perfil: ['React', 'TypeScript', 'Git', 'Diseño web adaptable', 'Integración de servicios web', 'CSS', 'SQL'] };
  }
}