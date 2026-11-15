import { Injectable } from '@nestjs/common';
import { VacantesService } from '../vacantes.service';
import { ElasticsearchService } from './elasticsearch.service';
import type { VacancyIndexDocument } from './vacancy-index.types';

@Injectable()
export class VacantesIndexService {
  constructor(
    private readonly vacantesService: VacantesService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async buscar(query = '') {
    return this.elasticsearchService.searchVacancies(query);
  }

  async indexarVacante(id: string) {
    const vacancy = await this.vacantesService.obtenerVacantePorId(id);

    const document: VacancyIndexDocument = {
      id: vacancy.id,
      idEmpresa: vacancy.idEmpresa,
      titulo: vacancy.titulo,
      empresa: vacancy.empresa,
      modalidad: vacancy.modalidad,
      estado: vacancy.estado,
      fechaCreacion: vacancy.fechaCreacion,
      descripcion: vacancy.descripcion,
      ubicacion: vacancy.ubicacion,
      area: vacancy.area,
      condiciones: vacancy.condiciones,
      requisitos: vacancy.requisitos.map(
        (requirement: { id: string; nombre: string }) => ({
          id: requirement.id,
          nombre: requirement.nombre,
        }),
      ),
    };

    const index = await this.elasticsearchService.indexVacancy(document);
    return { indexed: true, id: document.id, index };
  }
}
