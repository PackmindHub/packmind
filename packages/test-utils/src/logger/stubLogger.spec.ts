import { stubLogger } from './stubLogger';

describe('stubLogger', () => {
  it('creates a mocked PackmindLogger with all methods stubbed', () => {
    const logger = stubLogger();

    // Test that all methods are Jest mock functions
    expect(jest.isMockFunction(logger.error)).toBe(true);
    expect(jest.isMockFunction(logger.warn)).toBe(true);
    expect(jest.isMockFunction(logger.info)).toBe(true);
    expect(jest.isMockFunction(logger.http)).toBe(true);
    expect(jest.isMockFunction(logger.verbose)).toBe(true);
    expect(jest.isMockFunction(logger.debug)).toBe(true);
    expect(jest.isMockFunction(logger.silly)).toBe(true);
    expect(jest.isMockFunction(logger.log)).toBe(true);
    expect(jest.isMockFunction(logger.setLevel)).toBe(true);
    expect(jest.isMockFunction(logger.getName)).toBe(true);

    // Test that getName returns a default value
    expect(logger.getName()).toBe('TestLogger');
  });

  it('allows spying on method calls', () => {
    const logger = stubLogger();

    // Test that methods can be called and spied on
    logger.info('Test message', { key: 'value' });
    logger.error('Error message');

    expect(logger.info).toHaveBeenCalledWith('Test message', { key: 'value' });
    expect(logger.error).toHaveBeenCalledWith('Error message');
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('allows customizing method return values', () => {
    const logger = stubLogger();

    // Customize getName to return a different value
    logger.getName.mockReturnValue('CustomLogger');

    expect(logger.getName()).toBe('CustomLogger');
  });
});
