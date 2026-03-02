// @ts-expect-error Missing types for the lib
import stage from 'jest-stage';
import { ApiContext, createUserWithApiKey } from './apiClient';
import { createTestUser } from './userFactory';
import fs from 'fs';
import path from 'path';
import os from 'os';

export type WithTempSpaceContext = {
  testDir: string; // Temporary directory for test execution
};

export type UserSignedUpContext = WithTempSpaceContext & {
  apiKey: string;
  email: string;
  password: string;
  userId: string;
  organizationId: string;
  spaceId: string;
  baseUrl: string;
  authCookie: string;
};

export type UserSignedUpOptions = {
  email: string;
  password: string;
  baseUrl: string;
};

function getDefaultOptions(): UserSignedUpOptions {
  const testUser = createTestUser();
  return {
    email: testUser.email,
    password: testUser.password,
    baseUrl: 'http://localhost:4200',
  };
}

export function describeWithTempSpace(
  description: string,
  tests: (getContext: () => Promise<WithTempSpaceContext>) => void,
): void {
  describe(description, () => {
    let testDir: string;

    stage(async (): Promise<WithTempSpaceContext> => {
      // Create a temporary directory for this test execution
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-test-'));

      return { testDir };
    });

    // Clean up test directory after all tests
    afterEach(async () => {
      if (testDir && fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    // Pass the stage getter to tests
    tests(async () => stage());
  });
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
  userOptions?: Partial<UserSignedUpOptions>,
): void {
  describeWithTempSpace(description, () => {
    let options: UserSignedUpOptions;

    // Set up user context using jest-stage
    stage(
      async ({
        testDir,
      }: WithTempSpaceContext): Promise<UserSignedUpContext> => {
        options = { ...getDefaultOptions(), ...userOptions };

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
          spaceId: apiContext.spaceId,
          baseUrl: apiContext.baseUrl,
          authCookie: apiContext.authCookie,
          testDir,
        };
      },
    );

    // Pass the stage getter to tests
    tests(async () => stage());
  });
}
