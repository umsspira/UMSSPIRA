import { Module } from '@nestjs/common';
import { AfinidadController } from './afinidad.controller';
import { AfinidadService } from './afinidad.service';

@Module({ controllers: [AfinidadController], providers: [AfinidadService] })
export class AfinidadModule {}