import { PackmindHttpClient } from '../infra/http/PackmindHttpClient';

export function createMockHttpClient(
  overrides?: Partial<jest.Mocked<PackmindHttpClient>>,
): jest.Mocked<PackmindHttpClient> {
  return {
    getAuthContext: jest.fn(),
    request: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<PackmindHttpClient>;
}
