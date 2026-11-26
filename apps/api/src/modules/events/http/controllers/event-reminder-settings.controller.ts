import { Body, Controller, Get, Patch } from '@nestjs/common';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { EventReminderSettingsService } from '../../application/event-reminder-settings.service';
import { reminderSettingsSchema } from '../schemas/events.schemas';

@Controller('events/reminder-settings')
@RequirePermissions('eventos:manage')
export class EventReminderSettingsController {
  constructor(private readonly settings: EventReminderSettingsService) {}

  @Get()
  async get() {
    return { data: await this.settings.get() };
  }

  @Patch()
  async update(
    @Body(new ZodValidationPipe(reminderSettingsSchema))
    body: { anticipationHours: number },
  ) {
    return { data: await this.settings.update(body.anticipationHours) };
  }
}
