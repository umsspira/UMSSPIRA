import {
  IsBoolean,
  IsDateString,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateExperienciaLaboralDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  company!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  position!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1500)
  description!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  employmentType!: string;

  @IsDateString({ strict: true })
  startDate!: string;

  @IsBoolean()
  currentlyWorking!: boolean;

  @ValidateIf(
    (dto: CreateExperienciaLaboralDto) =>
      !dto.currentlyWorking && dto.endDate != null,
  )
  @IsDateString({ strict: true })
  endDate?: string | null;
}
