import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { CallbackService } from '../../callback/callback.service';
import { CallbackJobData } from '../queue.service';

@Processor(QUEUE_NAMES.CALLBACK)
export class CallbackProcessor extends WorkerHost {
  private readonly logger = new Logger(CallbackProcessor.name);

  constructor(private readonly callbackService: CallbackService) {
    super();
  }

  async process(job: Job<CallbackJobData>): Promise<void> {
    const { callbackId } = job.data;
    this.logger.debug(`Processing callback job: ${callbackId}`);

    try {
      await this.callbackService.processCallback(callbackId);
      this.logger.log(`Callback processed successfully: ${callbackId}`);
    } catch (error) {
      this.logger.error(`Failed to process callback ${callbackId}:`, error);
      throw error; // Rethrow to trigger retry
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<CallbackJobData>) {
    this.logger.debug(`Callback job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<CallbackJobData> | undefined, error: Error) {
    this.logger.error(`Callback job failed: ${job?.id}`, error.message);
  }
}
