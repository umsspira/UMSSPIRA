import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type {
  NivelEsperado,
  TipoRequisito,
} from '../contracts/requisito-tecnico';
import {
  NIVELES_ESPERADOS,
  TIPOS_REQUISITO,
} from '../contracts/requisito-tecnico';

export class ActualizarRequisitoDto {
  @IsOptional()
  @IsIn(NIVELES_ESPERADOS, {
    message: 'El nivel esperado debe ser Básico, Intermedio, Avanzado o Experto.',
  })
  nivel?: NivelEsperado;

  @IsOptional()
  @IsIn(TIPOS_REQUISITO, {
    message: 'El tipo debe ser Obligatorio o Deseable.',
  })
  tipo?: TipoRequisito;

  @IsOptional()
  @IsString({ message: 'La descripción opcional debe ser texto.' })
  @MaxLength(500, {
    message: 'La descripción no puede superar los 500 caracteres.',
  })
  descripcion?: string;
}
