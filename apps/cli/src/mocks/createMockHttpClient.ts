import { mockInterface } from '@packmind/test-utils';
import { PackmindHttpClient } from '../infra/http/PackmindHttpClient';

export function createMockHttpClient(
  overrides?: Partial<jest.Mocked<PackmindHttpClient>>,
): jest.Mocked<PackmindHttpClient> {
  return Object.assign(mockInterface<PackmindHttpClient>(), overrides);
}
