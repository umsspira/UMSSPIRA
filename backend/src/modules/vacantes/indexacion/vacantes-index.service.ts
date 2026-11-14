import { Injectable } from '@nestjs/common';
import { VacantesService } from '../vacantes.service';
import { ElasticsearchService } from './elasticsearch.service';
import type { VacancyIndexDocument } from './vacancy-index.types';

type VacancySource = Awaited<ReturnType<VacantesService['obtenerPorId']>>;

@Injectable()
export class VacantesIndexService {
  constructor(
    private readonly vacantesService: VacantesService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async indexarVacante(id: string) {
    const vacancy = await this.vacantesService.obtenerPorId(id);
    const document = this.mapToIndexDocument(vacancy);
    const index = await this.elasticsearchService.indexVacancy(document);

    return { indexed: true, id: vacancy.id, index };
  }

  buscar(query: string) {
    return this.elasticsearchService.searchVacancies(query);
  }

  mapToIndexDocument(vacancy: VacancySource): VacancyIndexDocument {
    return {
      id: vacancy.id,
      idEmpresa: vacancy.idEmpresa,
      empresa: vacancy.empresa,
      titulo: vacancy.titulo,
      modalidad: vacancy.modalidad,
      estado: vacancy.estado,
      fechaCreacion: vacancy.fechaCreacion,
      descripcion: vacancy.descripcion,
      ubicacion: vacancy.ubicacion,
      area: vacancy.area,
      condiciones: vacancy.condiciones,
      requisitos: vacancy.requisitos.map((requirement) => ({
        id: requirement.id,
        nombre: requirement.nombre,
      })),
    };
  }
}
