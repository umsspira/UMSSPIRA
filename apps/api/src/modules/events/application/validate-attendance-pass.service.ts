import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import type { ActorContext } from '../../../shared/security/contexts/actor-context';
import { findAttendancePass } from '../infrastructure/repositories/find-attendance-pass';

@Injectable()
export class ValidateAttendancePassService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(actor: ActorContext, eventId: string, qrToken: string): Promise<void> {
    await this.prisma.$transaction((tx) => findAttendancePass(tx, actor, eventId, qrToken));
  }
}
