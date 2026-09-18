import { createIntegrationTestFixture } from './createIntegrationTestFixture';
import { accountsSchemas } from '@packmind/accounts';
import { spacesSchemas } from '@packmind/spaces';
import { commandsSchemas } from '@packmind/commands';
import { standardsSchemas } from '@packmind/standards';
import { skillsSchemas } from '@packmind/skills';
import { gitSchemas } from '@packmind/git';
import { playbookChangeManagementSchemas } from '@packmind/playbook-change-management';
import { TestApp } from './TestApp';
import {
  Organization,
  OrganizationId,
  Space,
  SpaceId,
  User,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { deploymentsSchemas } from '@packmind/deployments';

type IntegrationTestContext = {
  testApp: TestApp;
};

export type IntegrationTest<
  T extends IntegrationTestContext = IntegrationTestContext,
> = (tests: (getContext: () => Promise<T>) => void) => () => void;

const integrationTestSchemas = [
  ...accountsSchemas,
  ...spacesSchemas,
  ...commandsSchemas,
  ...standardsSchemas,
  ...skillsSchemas,
  ...gitSchemas,
  ...playbookChangeManagementSchemas,
  ...deploymentsSchemas,
];

/**
 * Builds the describe body shared by `integrationTest` and
 * `integrationTestWithUser`.
 *
 * The context is built once per file, in `beforeAll`, and its rows are
 * snapshotted; `getContext()` hands every test that same context and
 * `afterEach` rewinds the database to the snapshot. A sign-up is therefore paid
 * once per file rather than once per test — at the cost of a shared `TestApp`,
 * so a test's spies must be installed in `beforeEach` (`restoreMocks` is
 * enabled for this project and reverts them after each test).
 */
function describeWithContext<T extends IntegrationTestContext>(
  buildContext: (base: IntegrationTestContext) => Promise<T>,
): IntegrationTest<T> {
  return (tests) => {
    return () => {
      const fixture = createIntegrationTestFixture(integrationTestSchemas);

      let context: T;

      beforeAll(async () => {
        await fixture.initialize();

        const testApp = await fixture.createTestApp();
        context = await buildContext({ testApp });

        fixture.snapshot();
      });

      afterEach(async () => {
        await fixture.cleanup();
      });

      afterAll(() => fixture.destroy());

      tests(async () => context);
    };
  };
}

export const integrationTest: IntegrationTest = describeWithContext(
  async (base) => base,
);

export type IntegrationTestWithUserContext = IntegrationTestContext & {
  user: User;
  organization: Organization;
  space: Space;
  basePackmindCommand: {
    userId: UserId;
    organizationId: OrganizationId;
    spaceId: SpaceId;
  };
};

export type IntegrationTestWithUserInput = {
  email: string;
  password: string;
};

const defaultIntegrationTestWithUserInput: IntegrationTestWithUserInput = {
  email: 'someone@example.com',
  password: uuidv4(),
};

export const integrationTestWithUser: IntegrationTest<IntegrationTestWithUserContext> =
  describeWithContext(async ({ testApp }) => {
    const signUpResponse = await testApp.accountsHexa
      .getAdapter()
      .signUpWithOrganization({
        email: defaultIntegrationTestWithUserInput.email,
        password: defaultIntegrationTestWithUserInput.password,
        method: 'password',
      });
    const user = signUpResponse.user;
    const organization = signUpResponse.organization;

    const globalSpace = await testApp.spacesHexa
      .getAdapter()
      .getSpaceBySlug('global', organization.id);
    if (!globalSpace) {
      throw new Error(
        `No default space found in organization: ${organization}`,
      );
    }
    const space = globalSpace;

    return {
      testApp,
      user,
      organization,
      space,
      basePackmindCommand: {
        userId: user.id,
        organizationId: organization.id,
        spaceId: space.id,
      },
    };
  });
