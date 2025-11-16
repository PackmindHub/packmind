import { GitCommitSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import {
  GitCommit,
  Package,
  Recipe,
  Standard,
  RecipesDeployment,
  StandardsDeployment,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { DataFactory } from './helpers/DataFactory';
import { makeIntegrationTestDataSource } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

describe('Package deployment integration', () => {
  let testApp: TestApp;
  let dataFactory: DataFactory;

  let recipe1: Recipe;
  let recipe2: Recipe;
  let standard1: Standard;
  let standard2: Standard;

  let dataSource: DataSource;
  let commit: GitCommit;
  let commitToGit: jest.Mock;

  beforeEach(async () => {
    dataSource = await makeIntegrationTestDataSource();
    await dataSource.initialize();
    await dataSource.synchronize();

    testApp = new TestApp(dataSource);
    await testApp.initialize();

    dataFactory = new DataFactory(testApp);
    await dataFactory.withUserAndOrganization();
    await dataFactory.withGitRepo();

    recipe1 = await dataFactory.withRecipe({ name: 'Recipe 1' });
    recipe2 = await dataFactory.withRecipe({ name: 'Recipe 2' });

    standard1 = await dataFactory.withStandard({ name: 'Standard 1' });
    standard2 = await dataFactory.withStandard({ name: 'Standard 2' });

    commit = await createGitCommit();
    commitToGit = jest.fn().mockResolvedValue(commit);
    const gitAdapter = testApp.gitHexa.getAdapter();
    jest.spyOn(gitAdapter, 'commitToGit').mockImplementation(commitToGit);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await dataSource.destroy();
  });

  async function createGitCommit() {
    const gitCommitRepo = dataSource.getRepository(GitCommitSchema);
    return gitCommitRepo.save(gitCommitFactory());
  }

  describe('Package with recipes and standards', () => {
    let packageWithBoth: Package;

    beforeEach(async () => {
      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Full Package',
          description: 'Package with recipes and standards',
          recipeIds: [recipe1.id, recipe2.id],
          standardIds: [standard1.id, standard2.id],
        });
      packageWithBoth = response.package;
    });

    it('deploys package successfully', async () => {
      const result = await testApp.deploymentsHexa
        .getAdapter()
        .publishPackages({
          ...dataFactory.packmindCommand(),
          packageIds: [packageWithBoth.id],
          targetIds: [dataFactory.target.id],
        });

      expect(result).toHaveLength(2); // One for standards, one for recipes
      expect(result[0]).toHaveProperty('target');
      expect(result[0]).toHaveProperty('status');
      expect(commitToGit).toHaveBeenCalled();
    });

    it('fetches package with recipe and standard IDs', async () => {
      const response = await testApp.deploymentsHexa
        .getAdapter()
        .getPackageById({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          packageId: packageWithBoth.id,
        });

      const fetchedPackage = response.package;
      expect(fetchedPackage).toBeDefined();
      expect(fetchedPackage.id).toBe(packageWithBoth.id);
      expect(fetchedPackage.recipes).toHaveLength(2);
      expect(fetchedPackage.recipes).toContain(recipe1.id);
      expect(fetchedPackage.recipes).toContain(recipe2.id);
      expect(fetchedPackage.standards).toHaveLength(2);
      expect(fetchedPackage.standards).toContain(standard1.id);
      expect(fetchedPackage.standards).toContain(standard2.id);
    });

    it('lists packages by space with IDs', async () => {
      const packages = await testApp.deploymentsHexa
        .getAdapter()
        .listPackagesBySpace({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
        });

      expect(packages.packages).toHaveLength(1);
      const pkg = packages.packages[0];
      expect(pkg.recipes).toHaveLength(2);
      expect(pkg.standards).toHaveLength(2);
      expect(pkg.recipes).toContain(recipe1.id);
      expect(pkg.recipes).toContain(recipe2.id);
      expect(pkg.standards).toContain(standard1.id);
      expect(pkg.standards).toContain(standard2.id);
    });
  });

  describe('Package with only recipes', () => {
    it('deploys package with only recipes', async () => {
      const createResponse = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Recipe Only Package',
          description: 'Package with only recipes',
          recipeIds: [recipe1.id],
          standardIds: [],
        });

      const recipeOnlyPackage = createResponse.package;

      const result = await testApp.deploymentsHexa
        .getAdapter()
        .publishPackages({
          ...dataFactory.packmindCommand(),
          packageIds: [recipeOnlyPackage.id],
          targetIds: [dataFactory.target.id],
        });

      // publishArtifacts creates both recipe and standard deployment records
      expect(result).toHaveLength(2);

      // Find the recipes deployment (the one with recipeVersions)
      const recipesDeployment = result.find((d) => {
        const deployment = d as unknown as RecipesDeployment;
        return 'recipeVersions' in d && deployment.recipeVersions.length > 0;
      });
      expect(recipesDeployment).toBeDefined();
      expect(recipesDeployment).toHaveProperty('target');
      expect(recipesDeployment).toHaveProperty('status');

      // Find the standards deployment (the one with empty standardVersions)
      const standardsDeployment = result.find((d) => 'standardVersions' in d);
      expect(standardsDeployment).toBeDefined();
      expect(commitToGit).toHaveBeenCalled();

      const getResponse = await testApp.deploymentsHexa
        .getAdapter()
        .getPackageById({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          packageId: recipeOnlyPackage.id,
        });

      const fetchedPackage = getResponse.package;
      expect(fetchedPackage.recipes).toHaveLength(1);
      expect(fetchedPackage.standards).toHaveLength(0);
    });
  });

  describe('Package with only standards', () => {
    it('deploys package with only standards', async () => {
      const createResponse = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Standard Only Package',
          description: 'Package with only standards',
          recipeIds: [],
          standardIds: [standard1.id],
        });

      const standardOnlyPackage = createResponse.package;

      const result = await testApp.deploymentsHexa
        .getAdapter()
        .publishPackages({
          ...dataFactory.packmindCommand(),
          packageIds: [standardOnlyPackage.id],
          targetIds: [dataFactory.target.id],
        });

      // publishArtifacts creates both recipe and standard deployment records
      expect(result).toHaveLength(2);

      // Find the standards deployment (the one with standardVersions)
      const standardsDeployment = result.find((d) => {
        const deployment = d as unknown as StandardsDeployment;
        return (
          'standardVersions' in d && deployment.standardVersions.length > 0
        );
      });
      expect(standardsDeployment).toBeDefined();
      expect(standardsDeployment).toHaveProperty('target');
      expect(standardsDeployment).toHaveProperty('status');

      // Find the recipes deployment (the one with empty recipeVersions)
      const recipesDeployment = result.find((d) => 'recipeVersions' in d);
      expect(recipesDeployment).toBeDefined();
      expect(commitToGit).toHaveBeenCalled();

      const getResponse = await testApp.deploymentsHexa
        .getAdapter()
        .getPackageById({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          packageId: standardOnlyPackage.id,
        });

      const fetchedPackage = getResponse.package;
      expect(fetchedPackage.recipes).toHaveLength(0);
      expect(fetchedPackage.standards).toHaveLength(1);
    });
  });

  describe('Multiple packages deployment', () => {
    it('deploys multiple packages successfully', async () => {
      const response1 = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'First Package',
          description: 'First test package',
          recipeIds: [recipe1.id],
          standardIds: [standard1.id],
        });

      const response2 = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Second Package',
          description: 'Second test package',
          recipeIds: [recipe2.id],
          standardIds: [standard2.id],
        });

      const package1 = response1.package;
      const package2 = response2.package;

      const result = await testApp.deploymentsHexa
        .getAdapter()
        .publishPackages({
          ...dataFactory.packmindCommand(),
          packageIds: [package1.id, package2.id],
          targetIds: [dataFactory.target.id],
        });

      expect(result).toHaveLength(2); // One for standards, one for recipes (deduplicated)
      expect(result[0]).toHaveProperty('target');
      expect(result[0]).toHaveProperty('status');
      expect(commitToGit).toHaveBeenCalled();
    });
  });

  describe('Standard deployment with rules', () => {
    it('deploys standard with rules correctly loaded', async () => {
      // Create a standard with actual rules
      const standardWithRules = await testApp.standardsHexa
        .getAdapter()
        .createStandard({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Standard With Rules',
          description: 'A standard that has rules',
          scope: 'backend',
          rules: [
            { content: 'Always use TypeScript for type safety' },
            { content: 'Write unit tests for all business logic' },
          ],
        });

      const createResponse = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Package With Rules',
          description: 'Package containing standard with rules',
          recipeIds: [],
          standardIds: [standardWithRules.id],
        });

      const packageWithStandard = createResponse.package;

      const result = await testApp.deploymentsHexa
        .getAdapter()
        .publishPackages({
          ...dataFactory.packmindCommand(),
          packageIds: [packageWithStandard.id],
          targetIds: [dataFactory.target.id],
        });

      // publishArtifacts creates both recipe and standard deployment records
      expect(result).toHaveLength(2);

      // Find the standards deployment (the one with standardVersions)
      const standardsDeployment = result.find((d) => {
        const deployment = d as unknown as StandardsDeployment;
        return (
          'standardVersions' in d && deployment.standardVersions.length > 0
        );
      });
      expect(standardsDeployment).toBeDefined();
      expect(commitToGit).toHaveBeenCalled();

      // Verify the committed files contain the rules
      const commitCall = commitToGit.mock.calls[0];
      const fileUpdates = commitCall[1] as Array<{
        path: string;
        content: string;
      }>; // Second parameter is the file updates

      // Find the standard file in the updates
      const standardFile = fileUpdates.find((file) =>
        file.path.includes('.packmind/standards/standard-with-rules.md'),
      );

      expect(standardFile).toBeDefined();
      expect(standardFile?.content).toContain(
        'Always use TypeScript for type safety',
      );
      expect(standardFile?.content).toContain(
        'Write unit tests for all business logic',
      );
    });
  });
});
