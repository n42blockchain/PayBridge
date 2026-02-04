import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService, LogLevel } from '../structured-logger.service';

describe('StructuredLoggerService', () => {
  let logger: StructuredLoggerService;
  let mockConfigService: Partial<ConfigService>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StructuredLoggerService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    logger = await module.resolve<StructuredLoggerService>(StructuredLoggerService);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('setContext', () => {
    it('should set context', () => {
      logger.setContext('TestContext');
      logger.log('test message');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('setRequestId', () => {
    it('should set request ID', () => {
      logger.setRequestId('req-123');
      logger.log('test message');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('should log info level message', () => {
      logger.log('test message');

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('INFO');
      expect(logOutput).toContain('test message');
    });

    it('should log with context', () => {
      logger.log('test message', 'TestContext');

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('TestContext');
    });

    it('should log with data', () => {
      logger.log('test message', { key: 'value' }, 'TestContext');

      expect(consoleSpy).toHaveBeenCalledTimes(2); // message + data
    });
  });

  describe('error', () => {
    it('should log error level message', () => {
      logger.error('error message');

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('ERROR');
    });

    it('should log Error object', () => {
      const error = new Error('Test error');
      logger.error('error occurred', error);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log stack trace', () => {
      logger.error('error message', 'stack trace here', 'TestContext');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warn level message', () => {
      logger.warn('warning message');

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('WARN');
    });
  });

  describe('debug', () => {
    it('should log debug level message', () => {
      logger.debug('debug message');

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('DEBUG');
    });
  });

  describe('verbose', () => {
    it('should log verbose level message', () => {
      logger.verbose('verbose message');

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('VERBOSE');
    });
  });

  describe('production mode', () => {
    beforeEach(async () => {
      mockConfigService.get = jest.fn().mockReturnValue('production');

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StructuredLoggerService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      logger = await module.resolve<StructuredLoggerService>(StructuredLoggerService);
    });

    it('should output JSON in production', () => {
      logger.log('test message', 'TestContext');

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls[0][0];

      // Should be valid JSON
      expect(() => JSON.parse(logOutput)).not.toThrow();

      const parsed = JSON.parse(logOutput);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('test message');
      expect(parsed.context).toBe('TestContext');
      expect(parsed.timestamp).toBeDefined();
    });
  });
});
