// @ts-expect-error Missing types for the lib
import stage from 'jest-stage';
import { ApiContext, createUserWithApiKey } from './apiClient';
import { createTestUser } from './userFactory';

export interface UserSignedUpContext {
  apiKey: string;
  email: string;
  password: string;
  userId: string;
  organizationId: string;
  baseUrl: string;
}

export interface UserSignedUpOptions {
  email?: string;
  password?: string;
  baseUrl?: string;
}

function getDefaultOptions(): Required<UserSignedUpOptions> {
  const testUser = createTestUser();
  return {
    email: testUser.email,
    password: testUser.password,
    baseUrl: 'http://localhost:4200',
  };
}

/**
 * Jest test helper that sets up a user account with API key before running tests.
 * Similar to integration test helpers, uses jest-stage for context management.
 *
 * @param description - Test suite description
 * @param tests - Test callback function that receives a context getter
 * @param userOptions - Optional user creation options
 *
 * @example
 * ```typescript
 * describeWithUserSignedUp('whoami command', (getContext) => {
 *   let apiKey: string;
 *
 *   beforeEach(async () => {
 *     const context = await getContext();
 *     apiKey = context.apiKey;
 *   });
 *
 *   it('returns user info', async () => {
 *     const result = await runCli('whoami', { apiKey });
 *     expect(result.returnCode).toBe(0);
 *   });
 * });
 * ```
 */
export function describeWithUserSignedUp(
  description: string,
  tests: (getContext: () => Promise<UserSignedUpContext>) => void,
  userOptions?: UserSignedUpOptions,
): void {
  describe(description, () => {
    const options = { ...getDefaultOptions(), ...userOptions };

    // Set up user context using jest-stage
    stage(async (): Promise<UserSignedUpContext> => {
      const apiContext: ApiContext = await createUserWithApiKey({
        email: options.email,
        password: options.password,
        baseUrl: options.baseUrl,
      });

      return {
        apiKey: apiContext.apiKey,
        email: apiContext.email,
        password: apiContext.password,
        userId: apiContext.userId,
        organizationId: apiContext.organizationId,
        baseUrl: apiContext.baseUrl,
      };
    });

    // Pass the stage getter to tests
    tests(async () => stage());
  });
}
