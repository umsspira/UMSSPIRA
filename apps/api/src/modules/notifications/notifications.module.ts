import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { notificationsProviders } from './infrastructure/providers/notifications.providers';
import { RegisterPushSubscriptionController } from './http/controllers/register-push-subscription.controller';
import { UnregisterPushSubscriptionController } from './http/controllers/unregister-push-subscription.controller';
import { ListPushSubscriptionsController } from './http/controllers/list-push-subscriptions.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    RegisterPushSubscriptionController,
    UnregisterPushSubscriptionController,
    ListPushSubscriptionsController,
  ],
  providers: [...notificationsProviders],
})
export class NotificationsModule {}
