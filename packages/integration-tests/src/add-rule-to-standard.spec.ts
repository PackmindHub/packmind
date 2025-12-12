import { accountsSchemas } from '@packmind/accounts';
import { gitSchemas } from '@packmind/git';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import { makeTestDatasource } from '@packmind/test-utils';
import {
  Organization,
  Space,
  Standard,
  StandardVersion,
  User,
} from '@packmind/types';

import assert from 'assert';
import { DataSource } from 'typeorm';
import { cleanTestDatabase } from './helpers/DataFactory';
import { TestApp } from './helpers/TestApp';

describe('Add rule to standard integration', () => {
  let testApp: TestApp;
  let dataSource: DataSource;

  let standard: Standard;
  let organization: Organization;
  let user: User;
  let space: Space;

  beforeAll(async () => {
    // Create test datasource with all necessary schemas
    dataSource = await makeTestDatasource([
      ...accountsSchemas,
      ...standardsSchemas,
      ...gitSchemas,
      ...spacesSchemas,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    // Use TestApp which handles all hexa registration and initialization
    testApp = new TestApp(dataSource);
    await testApp.initialize();
  });

  beforeEach(async () => {
    // Clean database between tests
    await cleanTestDatabase(dataSource);

    // Create test data
    const signUpResult = await testApp.accountsHexa
      .getAdapter()
      .signUpWithOrganization({
        organizationName: 'test organization',
        email: 'toto@packmind.com',
        password: 's3cr3t!@',
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

  afterAll(async () => {
    await dataSource.destroy();
  });

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
          organizationName: 'other organization',
          email: 'other@packmind.com',
          password: 's3cr3t!@',
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

  test('The new standard version should contain the added rule', async () => {
    const newRuleContent = 'Always validate input parameters';

    // Get the current version before adding the rule
    const initialVersion = standard.version;

    // Add the rule to the standard
    const newStandardVersion: StandardVersion = await testApp.standardsHexa
      .getAdapter()
      .addRuleToStandard({
        standardSlug: standard.slug,
        ruleContent: newRuleContent,
        organizationId: organization.id,
        userId: user.id,
      });

    // Verify the new version was created with incremented version number
    expect(newStandardVersion.version).toBe(initialVersion + 1);
    expect(newStandardVersion.standardId).toBe(standard.id);
    expect(newStandardVersion.userId).toBe(user.id);

    // Get the rules for the updated standard to verify the rule was added
    const rules = await testApp.standardsHexa
      .getAdapter()
      .getRulesByStandardId(standard.id);

    expect(rules).toBeDefined();
    expect(rules).toHaveLength(3); // 2 original + 1 new

    // Verify the original rules are preserved
    const ruleContents = rules.map((rule) => rule.content);
    expect(ruleContents).toContain('Use meaningful variable names');
    expect(ruleContents).toContain('Write unit tests for your code');

    // Verify the new rule was added
    expect(ruleContents).toContain(newRuleContent);

    // Verify that the main standard record was updated with the new version number
    const updatedStandard = await testApp.standardsHexa
      .getAdapter()
      .getStandardById({
        standardId: standard.id,
        organizationId: organization.id,
        spaceId: space.id,
        userId: user.id,
      });
    assert(updatedStandard, 'Updated standard should exist');
    assert(updatedStandard.standard, 'Updated standard.standard should exist');
    expect(updatedStandard.standard.version).toBe(initialVersion + 1);
  });

  test('Multiple rules can be added sequentially', async () => {
    const firstRuleContent = 'Use TypeScript strict mode';
    const secondRuleContent = 'Implement proper error handling';

    // Add first rule
    const firstVersion = await testApp.standardsHexa
      .getAdapter()
      .addRuleToStandard({
        standardSlug: standard.slug,
        ruleContent: firstRuleContent,
        organizationId: organization.id,
        userId: user.id,
      });

    expect(firstVersion.version).toBe(2); // Initial was 1

    // Add second rule
    const secondVersion = await testApp.standardsHexa
      .getAdapter()
      .addRuleToStandard({
        standardSlug: standard.slug,
        ruleContent: secondRuleContent,
        organizationId: organization.id,
        userId: user.id,
      });

    expect(secondVersion.version).toBe(3); // Incremented again

    // Verify final state by getting rules for the standard
    const finalRules = await testApp.standardsHexa
      .getAdapter()
      .getRulesByStandardId(standard.id);

    expect(finalRules).toHaveLength(4); // 2 original + 2 new

    const ruleContents = finalRules.map((rule) => rule.content);
    expect(ruleContents).toContain('Use meaningful variable names');
    expect(ruleContents).toContain('Write unit tests for your code');
    expect(ruleContents).toContain(firstRuleContent);
    expect(ruleContents).toContain(secondRuleContent);
  });

  test('Standard slug should be case-insensitive', async () => {
    const newRuleContent = 'Use consistent naming conventions';

    // Test with mixed case version of the standard slug
    const mixedCaseSlug = standard.slug
      .split('-')
      .map((part, index) =>
        index === 0
          ? part.charAt(0).toUpperCase() + part.slice(1)
          : part.charAt(0).toUpperCase() + part.slice(1),
      )
      .join('-');

    // Ensure the mixed case slug is actually different from the original
    expect(mixedCaseSlug).not.toBe(standard.slug);

    // Add rule using mixed case slug - this should work and normalize the slug internally
    const newStandardVersion = await testApp.standardsHexa
      .getAdapter()
      .addRuleToStandard({
        standardSlug: mixedCaseSlug,
        ruleContent: newRuleContent,
        organizationId: organization.id,
        userId: user.id,
      });

    // Verify the rule was added successfully
    expect(newStandardVersion.version).toBe(standard.version + 1);
    expect(newStandardVersion.standardId).toBe(standard.id);

    // Verify the rule was actually added to the standard
    const rules = await testApp.standardsHexa
      .getAdapter()
      .getRulesByStandardId(standard.id);
    const ruleContents = rules.map((rule) => rule.content);
    expect(ruleContents).toContain(newRuleContent);
  });
});
