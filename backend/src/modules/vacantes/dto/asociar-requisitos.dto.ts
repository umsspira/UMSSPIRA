import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { RequisitoTecnicoItemDto } from './requisito-tecnico-item.dto';

export class AsociarRequisitosDto {
  @IsArray({ message: 'Los requisitos deben proporcionarse como un arreglo.' })
  @ArrayNotEmpty({ message: 'Debe incluir al menos un requisito técnico.' })
  @ValidateNested({ each: true })
  @Type(() => RequisitoTecnicoItemDto)
  requisitos: RequisitoTecnicoItemDto[];
}
