import { Injectable } from '@nestjs/common';
import { VacantesService } from '../vacantes.service';

type VacancySource = Awaited<ReturnType<VacantesService['obtenerVacantePorId']>>;

@Injectable()
export class VacantesIndexService {
  constructor(private readonly vacantesService: VacantesService) {}

  async buscar(query = '') {
    // Lógica de búsqueda indexada
    return [];
  }

  async indexarVacante(id: string) {
    const vacancy = await this.vacantesService.obtenerVacantePorId(id);
    
    // Mapeo seguro con tipado explícito para evitar errores
    const indexData = {
      id: vacancy.id,
      titulo: vacancy.titulo,
      empresa: vacancy.empresa,
      descripcion: vacancy.descripcion,
      ubicacion: vacancy.ubicacion,
      area: vacancy.area,
      requisitos: vacancy.requisitos.map((requirement: { id: string; nombre: string }) => ({
        id: requirement.id,
        nombre: requirement.nombre,
      })),
    };

    return indexData;
  }
}
