import { PackmindLogger } from '@packmind/logger';
import { createMockInstance } from '../createMockInstance';

export function stubLogger(): jest.Mocked<PackmindLogger> {
  const stub = createMockInstance(PackmindLogger);
  stub.getName.mockReturnValue('TestLogger');

  return stub;
}
