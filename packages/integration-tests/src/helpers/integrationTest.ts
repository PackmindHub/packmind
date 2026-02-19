// @ts-expect-error Missing types for the lib
import stage from 'jest-stage';
import { createIntegrationTestFixture } from './createIntegrationTestFixture';
import { accountsSchemas } from '@packmind/accounts';
import { spacesSchemas } from '@packmind/spaces';
import { recipesSchemas } from '@packmind/recipes';
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

type IntegrationTestContext = {
  testApp: TestApp;
};

export type IntegrationTest<
  T extends IntegrationTestContext = IntegrationTestContext,
> = (name: string, tests: (getContext: () => Promise<T>) => void) => void;

export const integrationTest: IntegrationTest = (name, tests) => {
  describe(name, () => {
    const fixture = createIntegrationTestFixture([
      ...accountsSchemas,
      ...spacesSchemas,
      ...recipesSchemas,
      ...standardsSchemas,
      ...skillsSchemas,
      ...gitSchemas,
      ...playbookChangeManagementSchemas,
    ]);

    beforeAll(() => fixture.initialize());

    afterEach(async () => {
      await fixture.cleanup();
    });

    stage(async () => {
      const testApp = new TestApp(fixture.datasource);
      await testApp.initialize();

      return {
        testApp,
        fixture,
      };
    });

    tests(async () => stage());
  });
};

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

export const integrationTestWithUser: IntegrationTest<
  IntegrationTestWithUserContext
> = (name, tests) => {
  return integrationTest(name, () => {
    stage(async ({ testApp }: IntegrationTestContext) => {
      const signUpResponse = await testApp.accountsHexa
        .getAdapter()
        .signUpWithOrganization({
          email: 'someone@example.com',
          password: 'some-secret-apssword',
          authType: 'password',
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

    tests(async () => stage());
  });
};
