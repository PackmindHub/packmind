import { PackmindLogger } from '@packmind/logger';

export function stubLogger(): jest.Mocked<PackmindLogger> {
  const stub = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    silly: jest.fn(),
    log: jest.fn(),
    setLevel: jest.fn(),
    getName: jest.fn().mockReturnValue('TestLogger'),
  } as unknown as jest.Mocked<PackmindLogger>;

  return stub;
}
