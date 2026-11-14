import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type {
  NivelEsperado,
  TipoRequisito,
} from '../contracts/requisito-tecnico';
import {
  NIVELES_ESPERADOS,
  TIPOS_REQUISITO,
} from '../contracts/requisito-tecnico';


export class RequisitoTecnicoItemDto {
  @IsOptional()
  @IsUUID('all', { message: 'id del requisito debe ser un UUID válido si se proporciona.' })
  id?: string;

  @IsString({ message: 'La competencia técnica debe ser texto.' })
  @IsNotEmpty({ message: 'La competencia técnica es obligatoria.' })
  @MaxLength(100, {
    message: 'La competencia técnica no puede superar los 100 caracteres.',
  })
  competencia: string;

  @IsIn(NIVELES_ESPERADOS, {
    message: 'El nivel esperado debe ser Básico, Intermedio, Avanzado o Experto.',
  })
  nivel: NivelEsperado;

  @IsIn(TIPOS_REQUISITO, {
    message: 'El tipo debe ser Obligatorio o Deseable.',
  })
  tipo: TipoRequisito;

  @IsOptional()
  @IsString({ message: 'La descripción opcional debe ser texto.' })
  @MaxLength(500, {
    message: 'La descripción no puede superar los 500 caracteres.',
  })
  descripcion?: string;
}
