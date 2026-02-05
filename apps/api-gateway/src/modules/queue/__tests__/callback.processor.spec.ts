import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { CallbackProcessor } from '../processors/callback.processor';
import { CallbackService } from '../../callback/callback.service';
import { CallbackJobData } from '../queue.service';

describe('CallbackProcessor', () => {
  let processor: CallbackProcessor;
  let mockCallbackService: any;

  beforeEach(async () => {
    mockCallbackService = {
      processCallback: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallbackProcessor,
        { provide: CallbackService, useValue: mockCallbackService },
      ],
    }).compile();

    processor = module.get<CallbackProcessor>(CallbackProcessor);
  });

  describe('process', () => {
    it('should process callback successfully', async () => {
      const callbackId = 'callback-123';
      mockCallbackService.processCallback.mockResolvedValue(undefined);

      const mockJob = {
        id: 'job-1',
        data: { callbackId } as CallbackJobData,
      } as Job<CallbackJobData>;

      await processor.process(mockJob);

      expect(mockCallbackService.processCallback).toHaveBeenCalledWith(callbackId);
    });

    it('should throw error when callback processing fails', async () => {
      const callbackId = 'callback-456';
      const error = new Error('Callback failed');
      mockCallbackService.processCallback.mockRejectedValue(error);

      const mockJob = {
        id: 'job-2',
        data: { callbackId } as CallbackJobData,
      } as Job<CallbackJobData>;

      await expect(processor.process(mockJob)).rejects.toThrow('Callback failed');
      expect(mockCallbackService.processCallback).toHaveBeenCalledWith(callbackId);
    });

    it('should handle network timeout errors', async () => {
      const callbackId = 'callback-789';
      const timeoutError = new Error('ETIMEDOUT');
      mockCallbackService.processCallback.mockRejectedValue(timeoutError);

      const mockJob = {
        id: 'job-3',
        data: { callbackId } as CallbackJobData,
      } as Job<CallbackJobData>;

      await expect(processor.process(mockJob)).rejects.toThrow('ETIMEDOUT');
    });
  });

  describe('onCompleted', () => {
    it('should log completion', () => {
      const mockJob = {
        id: 'job-completed',
        data: { callbackId: 'callback-123' } as CallbackJobData,
      } as Job<CallbackJobData>;

      // Should not throw
      expect(() => processor.onCompleted(mockJob)).not.toThrow();
    });
  });

  describe('onFailed', () => {
    it('should handle failed job with error', () => {
      const mockJob = {
        id: 'job-failed',
        data: { callbackId: 'callback-456' } as CallbackJobData,
      } as Job<CallbackJobData>;
      const error = new Error('Processing failed');

      // Should not throw
      expect(() => processor.onFailed(mockJob, error)).not.toThrow();
    });

    it('should handle undefined job', () => {
      const error = new Error('Unknown error');

      // Should not throw when job is undefined
      expect(() => processor.onFailed(undefined, error)).not.toThrow();
    });
  });
});
