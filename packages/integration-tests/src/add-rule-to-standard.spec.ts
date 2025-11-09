import { accountsSchemas, AccountsHexa } from '@packmind/accounts';
import { User, Organization } from '@packmind/types';
import { StandardsHexa, standardsSchemas } from '@packmind/standards';
import { Standard, StandardVersion } from '@packmind/standards/types';
import { GitHexa, gitSchemas } from '@packmind/git';
import { JobsHexa } from '@packmind/jobs';
import { SpacesHexa, spacesSchemas, Space } from '@packmind/spaces';
import { HexaRegistry } from '@packmind/node-utils';
import { makeTestDatasource } from '@packmind/test-utils';

import { DataSource } from 'typeorm';
import assert from 'assert';

describe('Add rule to standard integration', () => {
  let accountsHexa: AccountsHexa;
  let standardsHexa: StandardsHexa;
  let spacesHexa: SpacesHexa;
  let registry: HexaRegistry;
  let dataSource: DataSource;

  let standard: Standard;
  let organization: Organization;
  let user: User;
  let space: Space;

  beforeEach(async () => {
    // Create test datasource with all necessary schemas
    dataSource = await makeTestDatasource([
      ...accountsSchemas,
      ...standardsSchemas,
      ...gitSchemas,
      ...spacesSchemas,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    // Create HexaRegistry
    registry = new HexaRegistry();

    // Register hexas before initialization
    // NOTE: SpacesHexa must be registered before AccountsHexa
    // because AccountsHexa needs SpacesPort to create default space during signup
    registry.register(JobsHexa);
    registry.register(GitHexa);
    registry.register(SpacesHexa);
    registry.register(AccountsHexa);
    registry.register(StandardsHexa);

    // Initialize the registry with the datasource (now async)
    await registry.init(dataSource);

    // Get initialized hexas
    accountsHexa = registry.get(AccountsHexa);
    standardsHexa = registry.get(StandardsHexa);
    spacesHexa = registry.get(SpacesHexa);

    // Create test data
    const signUpResult = await accountsHexa
      .getAdapter()
      .signUpWithOrganization({
        organizationName: 'test organization',
        email: 'toto@packmind.com',
        password: 's3cr3t!@',
      });
    user = signUpResult.user;
    organization = signUpResult.organization;

    // Get the default "Global" space created during signup
    const spaces = await spacesHexa
      .getAdapter()
      .listSpacesByOrganization(organization.id);
    const foundSpace = spaces.find((s) => s.name === 'Global');
    assert(foundSpace, 'Default Global space should exist');
    space = foundSpace;

    // Create a standard to work with
    standard = await standardsHexa.getAdapter().createStandard({
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
    await dataSource.destroy();
  });

  describe('when standard slug is not found in the organization', () => {
    test('An error is thrown', async () => {
      const nonExistentSlug = 'non-existent-standard';

      await expect(
        standardsHexa.getAdapter().addRuleToStandard({
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
      const otherSignUpResult = await accountsHexa
        .getAdapter()
        .signUpWithOrganization({
          organizationName: 'other organization',
          email: 'other@packmind.com',
          password: 's3cr3t!@',
        });
      const otherUser = otherSignUpResult.user;

      // Try to add rule to standard from the first organization using the second organization's context
      await expect(
        standardsHexa.getAdapter().addRuleToStandard({
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
    const newStandardVersion: StandardVersion = await standardsHexa
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
    const rules = await standardsHexa
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
    const updatedStandard = await standardsHexa.getAdapter().getStandardById({
      standardId: standard.id,
      organizationId: organization.id,
      spaceId: space.id,
      userId: user.id,
    });
    assert(updatedStandard);
    expect(updatedStandard.standard.version).toBe(initialVersion + 1);
  });

  test('Multiple rules can be added sequentially', async () => {
    const firstRuleContent = 'Use TypeScript strict mode';
    const secondRuleContent = 'Implement proper error handling';

    // Add first rule
    const firstVersion = await standardsHexa.getAdapter().addRuleToStandard({
      standardSlug: standard.slug,
      ruleContent: firstRuleContent,
      organizationId: organization.id,
      userId: user.id,
    });

    expect(firstVersion.version).toBe(2); // Initial was 1

    // Add second rule
    const secondVersion = await standardsHexa.getAdapter().addRuleToStandard({
      standardSlug: standard.slug,
      ruleContent: secondRuleContent,
      organizationId: organization.id,
      userId: user.id,
    });

    expect(secondVersion.version).toBe(3); // Incremented again

    // Verify final state by getting rules for the standard
    const finalRules = await standardsHexa
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
    const newStandardVersion = await standardsHexa
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
    const rules = await standardsHexa
      .getAdapter()
      .getRulesByStandardId(standard.id);
    const ruleContents = rules.map((rule) => rule.content);
    expect(ruleContents).toContain(newRuleContent);
  });
});
