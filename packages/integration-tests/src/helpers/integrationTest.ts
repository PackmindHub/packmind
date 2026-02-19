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
import { v4 as uuidv4 } from 'uuid';

type IntegrationTestContext = {
  testApp: TestApp;
};

export type IntegrationTest<
  T extends IntegrationTestContext = IntegrationTestContext,
> = (tests: (getContext: () => Promise<T>) => void) => () => void;

export const integrationTest: IntegrationTest = (tests) => {
  return () => {
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

    afterAll(() => fixture.destroy());

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
  };
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

export type IntegrationTestWithUserInput = {
  email: string;
  password: string;
};

const defaultIntegrationTestWithUserInput: IntegrationTestWithUserInput = {
  email: 'someone@example.com',
  password: uuidv4(),
};

export const integrationTestWithUser: IntegrationTest<
  IntegrationTestWithUserContext
> = (tests, testData?: Partial<IntegrationTestWithUserInput>) => {
  return integrationTest(() => {
    stage(async ({ testApp }: IntegrationTestContext) => {
      const fullTestData = {
        ...defaultIntegrationTestWithUserInput,
        ...testData,
      };

      const signUpResponse = await testApp.accountsHexa
        .getAdapter()
        .signUpWithOrganization({
          email: fullTestData.email,
          password: fullTestData.password,
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

    tests(async () => stage());
  });
};
