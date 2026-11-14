import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ReferenciaRequisitosTecnicosDto } from './referencia-requisitos-tecnicos.dto';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ValidarEstructuraVacanteDto {
  @IsUUID('4', { message: 'id debe ser un UUID válido.' })
  id!: string;

  @Transform(trimString)
  @IsString({ message: 'titulo debe ser texto.' })
  @IsNotEmpty({ message: 'titulo es obligatorio.' })
  @MaxLength(150, {
    message: 'titulo no puede superar los 150 caracteres.',
  })
  titulo!: string;

  @IsUUID('4', { message: 'idEmpresa debe ser un UUID válido.' })
  idEmpresa!: string;

  @Transform(trimString)
  @IsString({ message: 'estado debe ser texto.' })
  @IsNotEmpty({ message: 'estado es obligatorio.' })
  @MaxLength(30, {
    message: 'estado no puede superar los 30 caracteres.',
  })
  estado!: string;

  @IsDefined({ message: 'requisitosTecnicos es obligatorio.' })
  @ValidateNested()
  @Type(() => ReferenciaRequisitosTecnicosDto)
  requisitosTecnicos!: ReferenciaRequisitosTecnicosDto;
}
