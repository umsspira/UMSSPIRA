import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateFormacionAcademicaDto {
  @IsUUID()
  idEgresado!: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  idCarrera?: string | null;

  @IsIn(['Bachiller', 'Carrera'])
  tipoFormacion!: 'Bachiller' | 'Carrera';

  @IsString()
  @MaxLength(150)
  institucion!: string;

  @IsString()
  @MaxLength(150)
  titulo!: string;

  @IsString()
  @MaxLength(50)
  nivelAcademico!: string;

  @IsIn(['Cursando', 'Concluido', 'Titulado'])
  estado!: 'Cursando' | 'Concluido' | 'Titulado';

  @IsInt()
  @Min(1900)
  @Max(2100)
  anioInicio!: number;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsInt()
  @Min(1900)
  @Max(2100)
  anioFin?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  descripcion?: string;
}