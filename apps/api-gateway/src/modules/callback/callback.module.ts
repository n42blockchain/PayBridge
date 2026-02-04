import { Module } from '@nestjs/common';
import { CallbackService } from './callback.service';
import { ChannelCallbackController } from './channel-callback.controller';

@Module({
  controllers: [ChannelCallbackController],
  providers: [CallbackService],
  exports: [CallbackService],
})
export class CallbackModule {}
