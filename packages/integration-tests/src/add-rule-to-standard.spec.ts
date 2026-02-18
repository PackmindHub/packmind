import { accountsSchemas } from '@packmind/accounts';
import { gitSchemas } from '@packmind/git';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import {
  Organization,
  Space,
  Standard,
  StandardVersion,
  User,
} from '@packmind/types';

import assert from 'assert';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { TestApp } from './helpers/TestApp';

describe('Add rule to standard integration', () => {
  const fixture = createIntegrationTestFixture([
    ...accountsSchemas,
    ...standardsSchemas,
    ...gitSchemas,
    ...spacesSchemas,
  ]);

  let testApp: TestApp;

  let standard: Standard;
  let organization: Organization;
  let user: User;
  let space: Space;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    // Use TestApp which handles all hexa registration and initialization
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    // Create test data
    const signUpResult = await testApp.accountsHexa
      .getAdapter()
      .signUpWithOrganization({
        email: 'toto@packmind.com',
        password: 's3cr3t!@',
        method: 'password',
      });
    user = signUpResult.user;
    organization = signUpResult.organization;

    // Get the default "Global" space created during signup
    const spaces = await testApp.spacesHexa
      .getAdapter()
      .listSpacesByOrganization(organization.id);
    const foundSpace = spaces.find((s) => s.name === 'Global');
    assert(foundSpace, 'Default Global space should exist');
    space = foundSpace;

    // Create a standard to work with
    standard = await testApp.standardsHexa.getAdapter().createStandard({
      name: 'My Test Standard',
      description: 'A test standard for integration testing',
      rules: [
        { content: 'Use meaningful variable names' },
        { content: 'Write unit tests for your code' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: 'typescript',
      spaceId: space.id,
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when standard slug is not found in the organization', () => {
    test('An error is thrown', async () => {
      const nonExistentSlug = 'non-existent-standard';

      await expect(
        testApp.standardsHexa.getAdapter().addRuleToStandard({
          standardSlug: nonExistentSlug,
          ruleContent: 'Some new rule',
          organizationId: organization.id,
          userId: user.id,
        }),
      ).rejects.toThrow(
        'Standard slug not found, please check current standards first',
      );
    });
  });

  describe('when standard slug exists but belongs to different organization', () => {
    test('An error is thrown', async () => {
      // Create another organization and user
      const otherSignUpResult = await testApp.accountsHexa
        .getAdapter()
        .signUpWithOrganization({
          email: 'other@packmind.com',
          password: 's3cr3t!@',
          method: 'password',
        });
      const otherUser = otherSignUpResult.user;

      // Try to add rule to standard from the first organization using the second organization's context
      await expect(
        testApp.standardsHexa.getAdapter().addRuleToStandard({
          standardSlug: standard.slug,
          ruleContent: 'Unauthorized rule',
          organizationId: otherSignUpResult.organization.id,
          userId: otherUser.id,
        }),
      ).rejects.toThrow(
        'Standard slug not found, please check current standards first',
      );
    });
  });

  describe('when adding a rule to a standard', () => {
    const newRuleContent = 'Always validate input parameters';
    let initialVersion: number;
    let newStandardVersion: StandardVersion;
    let rules: { content: string }[];
    let ruleContents: string[];

    beforeEach(async () => {
      initialVersion = standard.version;
      const result = await testApp.standardsHexa
        .getAdapter()
        .addRuleToStandard({
          standardSlug: standard.slug,
          ruleContent: newRuleContent,
          organizationId: organization.id,
          userId: user.id,
        });
      newStandardVersion = result.standardVersion;

      rules = await testApp.standardsHexa
        .getAdapter()
        .getRulesByStandardId(standard.id);
      ruleContents = rules.map((rule) => rule.content);
    });

    test('increments the version number', async () => {
      expect(newStandardVersion.version).toBe(initialVersion + 1);
    });

    test('associates the new version with the correct standard', async () => {
      expect(newStandardVersion.standardId).toBe(standard.id);
    });

    test('associates the new version with the correct user', async () => {
      expect(newStandardVersion.userId).toBe(user.id);
    });

    test('returns defined rules', async () => {
      expect(rules).toBeDefined();
    });

    test('has three rules total', async () => {
      expect(rules).toHaveLength(3);
    });

    test('preserves the first original rule', async () => {
      expect(ruleContents).toContain('Use meaningful variable names');
    });

    test('preserves the second original rule', async () => {
      expect(ruleContents).toContain('Write unit tests for your code');
    });

    test('includes the new rule', async () => {
      expect(ruleContents).toContain(newRuleContent);
    });

    test('updates the main standard record version', async () => {
      const updatedStandard = await testApp.standardsHexa
        .getAdapter()
        .getStandardById({
          standardId: standard.id,
          organizationId: organization.id,
          spaceId: space.id,
          userId: user.id,
        });
      assert(updatedStandard, 'Updated standard should exist');
      assert(
        updatedStandard.standard,
        'Updated standard.standard should exist',
      );
      expect(updatedStandard.standard.version).toBe(initialVersion + 1);
    });
  });

  describe('when adding multiple rules sequentially', () => {
    const firstRuleContent = 'Use TypeScript strict mode';
    const secondRuleContent = 'Implement proper error handling';
    let firstResult: { standardVersion: StandardVersion };
    let secondResult: { standardVersion: StandardVersion };
    let finalRules: { content: string }[];
    let ruleContents: string[];

    beforeEach(async () => {
      firstResult = await testApp.standardsHexa.getAdapter().addRuleToStandard({
        standardSlug: standard.slug,
        ruleContent: firstRuleContent,
        organizationId: organization.id,
        userId: user.id,
      });

      secondResult = await testApp.standardsHexa
        .getAdapter()
        .addRuleToStandard({
          standardSlug: standard.slug,
          ruleContent: secondRuleContent,
          organizationId: organization.id,
          userId: user.id,
        });

      finalRules = await testApp.standardsHexa
        .getAdapter()
        .getRulesByStandardId(standard.id);
      ruleContents = finalRules.map((rule) => rule.content);
    });

    test('increments version to 2 after first rule', async () => {
      expect(firstResult.standardVersion.version).toBe(2);
    });

    test('increments version to 3 after second rule', async () => {
      expect(secondResult.standardVersion.version).toBe(3);
    });

    test('has four rules total', async () => {
      expect(finalRules).toHaveLength(4);
    });

    test('preserves the first original rule', async () => {
      expect(ruleContents).toContain('Use meaningful variable names');
    });

    test('preserves the second original rule', async () => {
      expect(ruleContents).toContain('Write unit tests for your code');
    });

    test('includes the first added rule', async () => {
      expect(ruleContents).toContain(firstRuleContent);
    });

    test('includes the second added rule', async () => {
      expect(ruleContents).toContain(secondRuleContent);
    });
  });

  describe('when using a mixed-case slug', () => {
    const newRuleContent = 'Use consistent naming conventions';
    let mixedCaseSlug: string;
    let newStandardVersion: StandardVersion;
    let initialVersion: number;
    let rules: { content: string }[];
    let ruleContents: string[];

    beforeEach(async () => {
      initialVersion = standard.version;
      mixedCaseSlug = standard.slug
        .split('-')
        .map((part, index) =>
          index === 0
            ? part.charAt(0).toUpperCase() + part.slice(1)
            : part.charAt(0).toUpperCase() + part.slice(1),
        )
        .join('-');

      const result = await testApp.standardsHexa
        .getAdapter()
        .addRuleToStandard({
          standardSlug: mixedCaseSlug,
          ruleContent: newRuleContent,
          organizationId: organization.id,
          userId: user.id,
        });
      newStandardVersion = result.standardVersion;

      rules = await testApp.standardsHexa
        .getAdapter()
        .getRulesByStandardId(standard.id);
      ruleContents = rules.map((rule) => rule.content);
    });

    test('transforms mixed-case slug differently from original', async () => {
      expect(mixedCaseSlug).not.toBe(standard.slug);
    });

    test('increments the version number', async () => {
      expect(newStandardVersion.version).toBe(initialVersion + 1);
    });

    test('associates the version with the correct standard', async () => {
      expect(newStandardVersion.standardId).toBe(standard.id);
    });

    test('adds the rule to the standard', async () => {
      expect(ruleContents).toContain(newRuleContent);
    });
  });
});
