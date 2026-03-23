// @ts-expect-error Missing types for the lib
import stage from 'jest-stage';
import { createTestUser } from './userFactory';
import {
  describeWithTempSpace,
  WithTempSpaceContext,
} from './describeWithTempSpace';
import { IPackmindGateway } from './IPackmindGateway';
import { Organization, Space, SpaceId, User } from '@packmind/types';
import { PackmindGateway } from './gateways/PackmindGateway';
import { getPackmindInstanceUrl } from './config';
import { runCli, RunCliOptions, RunCliResult } from './runCli';

export type UserSignedUpContext = WithTempSpaceContext & {
  gateway: IPackmindGateway;
  apiKey: string;
  user: User;
  organization: Organization;
  space: Space;
  /**
   * @deprecated use context.space.id instead
   */
  spaceId: SpaceId;
  runCli: (command: string, opts?: RunCliOptions) => Promise<RunCliResult>;
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
    baseUrl: getPackmindInstanceUrl(),
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
  userOptions?: Partial<UserSignedUpOptions>,
): void {
  describeWithTempSpace(description, () => {
    let options: UserSignedUpOptions;

    // Set up user context using jest-stage
    stage(
      async ({
        testDir,
        testHome,
      }: WithTempSpaceContext): Promise<UserSignedUpContext> => {
        options = { ...getDefaultOptions(), ...userOptions };
        const gateway = new PackmindGateway(options.baseUrl);

        const { user, organization } = await gateway.auth.signup({
          email: options.email,
          password: options.password,
          method: 'password',
        });
        await gateway.auth.signin({
          email: options.email,
          password: options.password,
        });

        const { apiKey } = await gateway.auth.generateApiKey({});

        // Initialize gateway with API key for authenticated requests
        gateway.initializeWithApiKey(apiKey);

        const globalSpace = await gateway.spaces.getGlobal();

        return {
          apiKey,
          gateway,
          user,
          organization,
          space: globalSpace,
          spaceId: globalSpace.id,
          testDir,
          testHome,
          runCli: (command, opts) =>
            runCli(command, { apiKey, cwd: testDir, home: testHome, ...opts }),
        };
      },
    );

    // Pass the stage getter to tests
    tests(async () => stage());
  });
}
