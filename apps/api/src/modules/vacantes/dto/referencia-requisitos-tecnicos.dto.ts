import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReferenciaRequisitosTecnicosDto {
  @IsArray({
    message: 'requisitosTecnicos.requerimientoLaboralIds debe ser un arreglo.',
  })
  @ArrayUnique({
    message:
      'requisitosTecnicos.requerimientoLaboralIds no debe contener referencias duplicadas.',
  })
  @IsUUID('4', {
    each: true,
    message:
      'Cada elemento de requisitosTecnicos.requerimientoLaboralIds debe ser un UUID válido.',
  })
  requerimientoLaboralIds!: string[];
}
