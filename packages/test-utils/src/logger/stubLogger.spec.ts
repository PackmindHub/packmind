import { stubLogger } from './stubLogger';

describe('stubLogger', () => {
  describe('getName', () => {
    it('returns TestLogger by default', () => {
      const logger = stubLogger();

      expect(logger.getName()).toBe('TestLogger');
    });

    describe('when customized with mockReturnValue', () => {
      it('returns the customized value', () => {
        const logger = stubLogger();

        logger.getName.mockReturnValue('CustomLogger');

        expect(logger.getName()).toBe('CustomLogger');
      });
    });
  });

  describe('log methods', () => {
    it('can be invoked without throwing errors', () => {
      const logger = stubLogger();

      expect(() => {
        logger.error('error');
        logger.warn('warn');
        logger.info('info');
        logger.debug('debug');
      }).not.toThrow();
    });
  });
});
