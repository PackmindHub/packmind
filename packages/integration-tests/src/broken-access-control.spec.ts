import { GitCommitSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import { TargetNotFoundError } from '@packmind/deployments';
import { Package, Recipe, Standard } from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';
import { DataQuery } from './helpers/DataQuery';

describe('Broken access control - target ownership validation', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let orgA: DataFactory;
  let orgB: DataFactory;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    orgA = new DataFactory(testApp);
    await orgA.withUserAndOrganization({ email: 'userA@example.com' });
    await orgA.withGitRepo();

    orgB = new DataFactory(testApp);
    await orgB.withUserAndOrganization({ email: 'userB@example.com' });
    await orgB.withGitRepo();

    const commit = await createGitCommit();
    const gitAdapter = testApp.gitHexa.getAdapter();
    jest.spyOn(gitAdapter, 'commitToGit').mockResolvedValue(commit);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  async function createGitCommit() {
    const gitCommitRepo = fixture.datasource.getRepository(GitCommitSchema);
    return gitCommitRepo.save(gitCommitFactory());
  }

  describe('publishPackages', () => {
    let orgAPackage: Package;

    beforeEach(async () => {
      const recipe = await orgA.withRecipe({ name: 'Recipe A' });
      const standard = await orgA.withStandard({ name: 'Standard A' });

      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: orgA.user.id,
          organizationId: orgA.organization.id,
          spaceId: orgA.space.id,
          name: 'Org A Package',
          description: 'Package belonging to org A',
          recipeIds: [recipe.id],
          standardIds: [standard.id],
        });
      orgAPackage = response.package;
    });

    describe("when targeting another organization's target", () => {
      it('throws TargetNotFoundError', async () => {
        await expect(
          testApp.deploymentsHexa.getAdapter().publishPackages({
            ...orgA.packmindCommand(),
            packageIds: [orgAPackage.id],
            targetIds: [orgB.target.id],
          }),
        ).rejects.toThrow(TargetNotFoundError);
      });
    });

    describe("when targeting own organization's target", () => {
      it('does not throw TargetNotFoundError', async () => {
        await expect(
          testApp.deploymentsHexa.getAdapter().publishPackages({
            ...orgA.packmindCommand(),
            packageIds: [orgAPackage.id],
            targetIds: [orgA.target.id],
          }),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('publishArtifacts', () => {
    let orgARecipe: Recipe;
    let orgAStandard: Standard;
    let orgAPackage: Package;

    beforeEach(async () => {
      orgARecipe = await orgA.withRecipe({ name: 'Recipe A' });
      orgAStandard = await orgA.withStandard({ name: 'Standard A' });

      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: orgA.user.id,
          organizationId: orgA.organization.id,
          spaceId: orgA.space.id,
          name: 'Org A Package',
          description: 'Package belonging to org A',
          recipeIds: [orgARecipe.id],
          standardIds: [orgAStandard.id],
        });
      orgAPackage = response.package;
    });

    describe("when targeting another organization's target", () => {
      it('throws TargetNotFoundError', async () => {
        const dataQuery = new DataQuery(testApp);
        const recipeVersionId = await dataQuery.getRecipeVersionId(orgARecipe);
        const standardVersionId =
          await dataQuery.getStandardVersionId(orgAStandard);

        await expect(
          testApp.deploymentsHexa.getAdapter().publishArtifacts({
            ...orgA.packmindCommand(),
            recipeVersionIds: [recipeVersionId],
            standardVersionIds: [standardVersionId],
            targetIds: [orgB.target.id],
            packagesSlugs: [orgAPackage.slug],
            packageIds: [orgAPackage.id],
          }),
        ).rejects.toThrow(TargetNotFoundError);
      });
    });

    describe("when targeting own organization's target", () => {
      it('does not throw TargetNotFoundError', async () => {
        const dataQuery = new DataQuery(testApp);
        const recipeVersionId = await dataQuery.getRecipeVersionId(orgARecipe);
        const standardVersionId =
          await dataQuery.getStandardVersionId(orgAStandard);

        await expect(
          testApp.deploymentsHexa.getAdapter().publishArtifacts({
            ...orgA.packmindCommand(),
            recipeVersionIds: [recipeVersionId],
            standardVersionIds: [standardVersionId],
            targetIds: [orgA.target.id],
            packagesSlugs: [orgAPackage.slug],
            packageIds: [orgAPackage.id],
          }),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('removePackageFromTargets', () => {
    let orgAPackage: Package;

    beforeEach(async () => {
      const recipe = await orgA.withRecipe({ name: 'Recipe A' });
      const standard = await orgA.withStandard({ name: 'Standard A' });

      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: orgA.user.id,
          organizationId: orgA.organization.id,
          spaceId: orgA.space.id,
          name: 'Org A Package',
          description: 'Package belonging to org A',
          recipeIds: [recipe.id],
          standardIds: [standard.id],
        });
      orgAPackage = response.package;

      await testApp.deploymentsHexa.getAdapter().publishPackages({
        ...orgA.packmindCommand(),
        packageIds: [orgAPackage.id],
        targetIds: [orgA.target.id],
      });
    });

    describe("when targeting another organization's target", () => {
      it('throws TargetNotFoundError', async () => {
        await expect(
          testApp.deploymentsHexa.getAdapter().removePackageFromTargets({
            ...orgA.packmindCommand(),
            packageId: orgAPackage.id,
            targetIds: [orgB.target.id],
          }),
        ).rejects.toThrow(TargetNotFoundError);
      });
    });

    describe("when targeting own organization's target", () => {
      it('does not throw TargetNotFoundError', async () => {
        await expect(
          testApp.deploymentsHexa.getAdapter().removePackageFromTargets({
            ...orgA.packmindCommand(),
            packageId: orgAPackage.id,
            targetIds: [orgA.target.id],
          }),
        ).resolves.not.toThrow();
      });
    });
  });
});
