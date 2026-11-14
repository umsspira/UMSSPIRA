import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateVacanteDto {
  @IsUUID()
  idEmpresa!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  titulo!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  modalidad!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  descripcion!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  ubicacion!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  area!: string;

  @IsString()
  @MaxLength(2000)
  condiciones!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  requisitos!: string[];
}
