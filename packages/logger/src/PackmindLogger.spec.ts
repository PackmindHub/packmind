import { PackmindLogger, LogLevel, formatConsoleLine } from './PackmindLogger';

describe('PackmindLogger', () => {
  let logger: PackmindLogger;

  describe('constructor', () => {
    describe('when creating logger with name and default INFO level', () => {
      beforeEach(() => {
        logger = new PackmindLogger('TestService');
      });

      it('creates a PackmindLogger instance', () => {
        expect(logger).toBeInstanceOf(PackmindLogger);
      });

      it('returns the correct name', () => {
        expect(logger.getName()).toBe('TestService');
      });
    });

    describe('when creating logger with name and specified level', () => {
      beforeEach(() => {
        logger = new PackmindLogger('TestRepository', LogLevel.DEBUG);
      });

      it('creates a PackmindLogger instance', () => {
        expect(logger).toBeInstanceOf(PackmindLogger);
      });

      it('returns the correct name', () => {
        expect(logger.getName()).toBe('TestRepository');
      });
    });
  });

  describe('LogLevel enum', () => {
    it('defines SILENT level as silent', () => {
      expect(LogLevel.SILENT).toBe('silent');
    });

    it('defines ERROR level as error', () => {
      expect(LogLevel.ERROR).toBe('error');
    });

    it('defines WARN level as warn', () => {
      expect(LogLevel.WARN).toBe('warn');
    });

    it('defines INFO level as info', () => {
      expect(LogLevel.INFO).toBe('info');
    });

    it('defines HTTP level as http', () => {
      expect(LogLevel.HTTP).toBe('http');
    });

    it('defines VERBOSE level as verbose', () => {
      expect(LogLevel.VERBOSE).toBe('verbose');
    });

    it('defines DEBUG level as debug', () => {
      expect(LogLevel.DEBUG).toBe('debug');
    });

    it('defines SILLY level as silly', () => {
      expect(LogLevel.SILLY).toBe('silly');
    });
  });

  describe('logging methods', () => {
    beforeEach(() => {
      logger = new PackmindLogger('TestLogger', LogLevel.SILLY);
    });

    it('executes error method without throwing', () => {
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    it('executes warn method without throwing', () => {
      expect(() => logger.warn('Test warning message')).not.toThrow();
    });

    it('executes info method without throwing', () => {
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    it('executes http method without throwing', () => {
      expect(() => logger.http('Test http message')).not.toThrow();
    });

    it('executes verbose method without throwing', () => {
      expect(() => logger.verbose('Test verbose message')).not.toThrow();
    });

    it('executes debug method without throwing', () => {
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });

    it('executes silly method without throwing', () => {
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

  describe('SILENT level behavior', () => {
    describe('when creating logger with SILENT level', () => {
      beforeEach(() => {
        logger = new PackmindLogger('SilentLogger', LogLevel.SILENT);
      });

      it('creates a PackmindLogger instance', () => {
        expect(logger).toBeInstanceOf(PackmindLogger);
      });

      it('returns the correct name', () => {
        expect(logger.getName()).toBe('SilentLogger');
      });
    });

    describe('when logging in SILENT mode', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        logger = new PackmindLogger('SilentLogger', LogLevel.SILENT);
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('executes logging methods without throwing', () => {
        expect(() => {
          logger.error('Silent error');
          logger.warn('Silent warn');
          logger.info('Silent info');
          logger.http('Silent http');
          logger.verbose('Silent verbose');
          logger.debug('Silent debug');
          logger.silly('Silent silly');
          logger.log(LogLevel.ERROR, 'Silent generic log');
        }).not.toThrow();
      });

      it('does not produce console output', () => {
        logger.error('Silent error');
        logger.warn('Silent warn');
        logger.info('Silent info');

        expect(consoleSpy).not.toHaveBeenCalled();
      });
    });

    describe('when switching to SILENT mode after construction', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        logger = new PackmindLogger('TestLogger', LogLevel.INFO);
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        logger.setLevel(LogLevel.SILENT);
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('executes logging methods without throwing', () => {
        expect(() => {
          logger.error('Silent error after setLevel');
          logger.info('Silent info after setLevel');
        }).not.toThrow();
      });

      it('does not produce console output', () => {
        logger.error('Silent error after setLevel');
        logger.info('Silent info after setLevel');

        expect(consoleSpy).not.toHaveBeenCalled();
      });
    });

    it('can switch from SILENT mode back to normal logging', () => {
      logger = new PackmindLogger('TestLogger', LogLevel.SILENT);
      logger.setLevel(LogLevel.ERROR);

      expect(() => {
        logger.error('Error after switching from silent');
      }).not.toThrow();
    });
  });

  describe('formatConsoleLine', () => {
    const baseRecord = {
      timestamp: '2026-08-14T17:00:00.000Z',
      level: 'info',
      message: 'Something happened',
      label: 'TestService',
    };

    // What @opentelemetry/instrumentation-winston injects into a record while a
    // span is active.
    const traceContext = {
      trace_id: 'abcdef0123456789abcdef0123456789',
      span_id: '0123456789abcdef',
      trace_flags: '01',
    };

    describe('when a span is active', () => {
      it('renders the shortened trace marker', () => {
        const line = formatConsoleLine({ ...baseRecord, ...traceContext });

        expect(line).toContain('[trace=abcdef01]');
      });

      it('keeps the trace fields out of the metadata blob', () => {
        const line = formatConsoleLine({ ...baseRecord, ...traceContext });

        expect(line).not.toContain('span_id');
      });

      it('still renders unrelated metadata', () => {
        const line = formatConsoleLine({
          ...baseRecord,
          ...traceContext,
          userId: '42',
        });

        expect(line).toContain('{"userId":"42"}');
      });
    });

    describe('when no span is active', () => {
      it('omits the trace marker', () => {
        const line = formatConsoleLine(baseRecord);

        expect(line).not.toContain('[trace=');
      });

      it('keeps the timestamp, label, level and message', () => {
        const line = formatConsoleLine(baseRecord);

        expect(line).toBe(
          '2026-08-14T17:00:00.000Z [TestService] info: Something happened',
        );
      });
    });
  });

  describe('integration test', () => {
    it('creates logger and logs messages at different levels', () => {
      logger = new PackmindLogger('IntegrationTestLogger', LogLevel.INFO);

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
