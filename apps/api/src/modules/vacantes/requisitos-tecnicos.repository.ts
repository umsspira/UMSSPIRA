import type { ActualizarRequisitoDto } from './dto/actualizar-requisito.dto';
import type { RequisitoTecnico } from './contracts/requisito-tecnico';

export const REQUISITOS_TECNICOS_REPOSITORY =
  'REQUISITOS_TECNICOS_REPOSITORY';

export interface RequisitosTecnicosRepository {
  crear(
    requisitos: RequisitoTecnico[],
  ): Promise<RequisitoTecnico[]>;
  listarPorVacante(idVacante: string): Promise<RequisitoTecnico[]>;
  actualizar(
    idVacante: string,
    idRequisito: string,
    cambios: ActualizarRequisitoDto,
  ): Promise<RequisitoTecnico | null>;
  eliminar(idVacante: string, idRequisito: string): Promise<boolean>;
}
