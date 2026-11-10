import type {
  RequisitoTecnico,
} from '../../src/modules/vacantes/contracts/requisito-tecnico';
import type { ActualizarRequisitoDto } from '../../src/modules/vacantes/dto/actualizar-requisito.dto';
import type { RequisitosTecnicosRepository } from '../../src/modules/vacantes/requisitos-tecnicos.repository';

export class InMemoryRequisitosTecnicosRepository
  implements RequisitosTecnicosRepository
{
  private readonly requirements: RequisitoTecnico[] = [];

  async crear(
    requisitos: RequisitoTecnico[],
  ): Promise<RequisitoTecnico[]> {
    this.requirements.push(...requisitos.map((item) => ({ ...item })));
    return requisitos.map((item) => ({ ...item }));
  }

  async listarPorVacante(idVacante: string): Promise<RequisitoTecnico[]> {
    return this.requirements
      .filter((item) => item.idVacante === idVacante)
      .map((item) => ({ ...item }));
  }

  async actualizar(
    idVacante: string,
    idRequisito: string,
    cambios: ActualizarRequisitoDto,
  ): Promise<RequisitoTecnico | null> {
    const item = this.requirements.find(
      (requirement) =>
        requirement.idVacante === idVacante &&
        requirement.id === idRequisito,
    );
    if (!item) {return null;}

    if (cambios.nivel !== undefined) {item.nivel = cambios.nivel;}
    if (cambios.tipo !== undefined) {item.tipo = cambios.tipo;}
    if (cambios.descripcion !== undefined) {
      item.descripcion = cambios.descripcion.trim() || undefined;
    }

    return { ...item };
  }

  async eliminar(
    idVacante: string,
    idRequisito: string,
  ): Promise<boolean> {
    const index = this.requirements.findIndex(
      (item) => item.idVacante === idVacante && item.id === idRequisito,
    );
    if (index < 0) {return false;}
    this.requirements.splice(index, 1);
    return true;
  }
}
