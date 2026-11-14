import { PartialType } from '@nestjs/mapped-types';
import { CreateExperienciaLaboralDto } from './create-experiencia-laboral.dto';

export class UpdateExperienciaLaboralDto extends PartialType(
  CreateExperienciaLaboralDto,
) {}
