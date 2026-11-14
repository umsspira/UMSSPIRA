import { PartialType } from '@nestjs/mapped-types';
import { CreateFormacionAcademicaDto } from './create-formation-academica.dto';

export class UpdateFormacionAcademicaDto extends PartialType(
  CreateFormacionAcademicaDto,
) {}