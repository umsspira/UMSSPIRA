import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { DemoChecklistController } from './demo-checklist.controller';
import { DemoChecklistService } from './demo-checklist.service';

@Module({
  imports: [PrismaModule],
  controllers: [DemoChecklistController],
  providers: [DemoChecklistService],
})
export class DemoChecklistModule {}
