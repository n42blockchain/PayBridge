import { Module } from '@nestjs/common';
import { OrderExpireJob } from './order-expire.job';
import { CallbackRetryJob } from './callback-retry.job';
import { CallbackModule } from '../callback/callback.module';

@Module({
  imports: [CallbackModule],
  providers: [OrderExpireJob, CallbackRetryJob],
})
export class JobsModule {}
