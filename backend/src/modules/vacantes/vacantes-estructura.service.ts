import { Injectable } from '@nestjs/common';
import { ResultadoValidacionVacante } from './contracts/vacante-estructurada';
import { ValidarEstructuraVacanteDto } from './dto/validar-estructura-vacante.dto';

@Injectable()
export class VacantesEstructuraService {
  preparar(dto: ValidarEstructuraVacanteDto): ResultadoValidacionVacante {
    return {
      valida: true,
      vacante: {
        id: dto.id,
        titulo: dto.titulo,
        idEmpresa: dto.idEmpresa,
        estado: dto.estado,
        requisitosTecnicos: {
          requerimientoLaboralIds: [
            ...dto.requisitosTecnicos.requerimientoLaboralIds,
          ],
        },
      },
    };
  }
}
