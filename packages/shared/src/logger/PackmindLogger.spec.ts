import { PackmindLogger, LogLevel } from './PackmindLogger';

describe('PackmindLogger', () => {
  let logger: PackmindLogger;

  describe('constructor', () => {
    it('creates logger with name and default INFO level', () => {
      logger = new PackmindLogger('TestService');
      expect(logger).toBeInstanceOf(PackmindLogger);
      expect(logger.getName()).toBe('TestService');
    });

    it('creates logger with name and specified level', () => {
      logger = new PackmindLogger('TestRepository', LogLevel.DEBUG);
      expect(logger).toBeInstanceOf(PackmindLogger);
      expect(logger.getName()).toBe('TestRepository');
    });
  });

  describe('LogLevel enum', () => {
    it('has all expected log levels', () => {
      expect(LogLevel.ERROR).toBe('error');
      expect(LogLevel.WARN).toBe('warn');
      expect(LogLevel.INFO).toBe('info');
      expect(LogLevel.HTTP).toBe('http');
      expect(LogLevel.VERBOSE).toBe('verbose');
      expect(LogLevel.DEBUG).toBe('debug');
      expect(LogLevel.SILLY).toBe('silly');
    });
  });

  describe('logging methods', () => {
    beforeEach(() => {
      logger = new PackmindLogger('TestLogger', LogLevel.SILLY); // Allow all log levels
    });

    it('executes logging methods without errors', () => {
      expect(() => logger.error('Test error message')).not.toThrow();
      expect(() => logger.warn('Test warning message')).not.toThrow();
      expect(() => logger.info('Test info message')).not.toThrow();
      expect(() => logger.http('Test http message')).not.toThrow();
      expect(() => logger.verbose('Test verbose message')).not.toThrow();
      expect(() => logger.debug('Test debug message')).not.toThrow();
      expect(() => logger.silly('Test silly message')).not.toThrow();
    });

    it('accepts metadata in log methods', () => {
      const meta = { userId: 123, action: 'test' };
      expect(() =>
        logger.info('Test message with metadata', meta),
      ).not.toThrow();
    });

    it('uses generic log method with level parameter', () => {
      expect(() =>
        logger.log(LogLevel.INFO, 'Test generic log message'),
      ).not.toThrow();
    });

    it('allows changing log level after construction', () => {
      logger = new PackmindLogger('ConfigurableLogger', LogLevel.ERROR);
      expect(() => logger.setLevel(LogLevel.INFO)).not.toThrow();
    });
  });

  describe('name functionality', () => {
    it('returns the correct name', () => {
      const serviceName = 'UserService';
      logger = new PackmindLogger(serviceName);
      expect(logger.getName()).toBe(serviceName);
    });

    it('works with different names', () => {
      const names = ['RecipeRepository', 'AuthService', 'DatabaseLogger'];

      names.forEach((name) => {
        const namedLogger = new PackmindLogger(name);
        expect(namedLogger.getName()).toBe(name);
      });
    });
  });

  describe('integration test', () => {
    it('creates logger and logs messages at different levels', () => {
      // This is more of an integration test to ensure the logger works end-to-end
      logger = new PackmindLogger('IntegrationTestLogger', LogLevel.INFO);

      // These should all execute without throwing
      expect(() => {
        logger.error('Integration test error');
        logger.warn('Integration test warn');
        logger.info('Integration test info');
        logger.setLevel(LogLevel.DEBUG);
        logger.debug('Integration test debug');
      }).not.toThrow();
    });
  });
});
