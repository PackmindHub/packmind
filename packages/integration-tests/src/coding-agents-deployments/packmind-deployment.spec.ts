import { GitCommitSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import {
  DistributionStatus,
  GitCommit,
  Package,
  PackagesDeployment,
  Recipe,
  RenderMode,
  Standard,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { DataFactory } from '../helpers/DataFactory';
import { makeIntegrationTestDataSource } from '../helpers/makeIntegrationTestDataSource';
import { TestApp } from '../helpers/TestApp';

/**
 * Note: With async deployment using delayed jobs, commitToGit is now called
 * asynchronously by the background job worker. These tests have been updated
 * to verify:
 * 1. Distributions are created with in_progress status
 * 2. Jobs are enqueued (mocked in integration tests)
 *
 * File content verification is covered by unit tests in PublishArtifactsUseCase.spec.ts
 */
describe('Packmind Deployment Spec', () => {
  let testApp: TestApp;
  let dataFactory: DataFactory;

  let standard1: Standard;
  let standard2: Standard;
  let recipe1: Recipe;
  let recipe2: Recipe;

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
    await dataFactory.withRenderMode([RenderMode.PACKMIND]);

    standard1 = await dataFactory.withStandard({ name: 'My first standard' });
    standard2 = await dataFactory.withStandard({ name: 'My second standard' });

    recipe1 = await dataFactory.withRecipe({ name: 'My first recipe' });
    recipe2 = await dataFactory.withRecipe({ name: 'My second recipe' });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await dataSource.destroy();
  });

  async function createGitCommit() {
    const gitCommitRepo = dataSource.getRepository(GitCommitSchema);
    return gitCommitRepo.save(gitCommitFactory());
  }

  async function createPackage(
    standards: Standard[],
    recipes: Recipe[],
    name: string,
  ): Promise<Package> {
    const response = await testApp.deploymentsHexa.getAdapter().createPackage({
      userId: dataFactory.user.id,
      organizationId: dataFactory.organization.id,
      spaceId: dataFactory.space.id,
      name,
      description: `Package for ${name}`,
      standardIds: standards.map((s) => s.id),
      recipeIds: recipes.map((r) => r.id),
    });
    return response.package;
  }

  async function distributePackage(
    pkg: Package,
  ): Promise<PackagesDeployment[]> {
    return testApp.deploymentsHexa.getAdapter().publishPackages({
      ...dataFactory.packmindCommand(),
      packageIds: [pkg.id],
      targetIds: [dataFactory.target.id],
    });
  }

  describe('when distributing standards via package', () => {
    let standardsPackage1: Package;

    beforeEach(async () => {
      // Mock the git commit to prevent actual git operations
      commit = await createGitCommit();
      commitToGit = jest.fn().mockResolvedValue(commit);
      const gitAdapter = testApp.gitHexa.getAdapter();
      jest.spyOn(gitAdapter, 'commitToGit').mockImplementation(commitToGit);

      standardsPackage1 = await createPackage(
        [standard1],
        [],
        'Standards Package 1',
      );
    });

    describe('when distributing a single package', () => {
      let result: PackagesDeployment[];

      beforeEach(async () => {
        result = await distributePackage(standardsPackage1);
      });

      it('creates exactly one distribution', async () => {
        expect(result).toHaveLength(1);
      });

      it('sets distribution status to in_progress', async () => {
        expect(result[0].status).toBe(DistributionStatus.in_progress);
      });
    });

    describe('when new package is distributed', () => {
      let result: PackagesDeployment[];

      beforeEach(async () => {
        await distributePackage(standardsPackage1);
        const standardsPackage2 = await createPackage(
          [standard2],
          [],
          'Standards Package 2',
        );
        result = await distributePackage(standardsPackage2);
      });

      it('creates exactly one distribution', async () => {
        expect(result).toHaveLength(1);
      });

      it('sets distribution status to in_progress', async () => {
        expect(result[0].status).toBe(DistributionStatus.in_progress);
      });
    });

    describe('when a standard previously distributed has been deleted', () => {
      let result: PackagesDeployment[];

      beforeEach(async () => {
        await testApp.standardsHexa.getAdapter().deleteStandard({
          standardId: standard1.id,
          userId: dataFactory.user.id.toString(),
          organizationId: dataFactory.organization.id.toString(),
        });
        await distributePackage(standardsPackage1);
        const standardsPackage2 = await createPackage(
          [standard2],
          [],
          'Standards Package 2',
        );
        result = await distributePackage(standardsPackage2);
      });

      it('creates exactly one distribution', async () => {
        expect(result).toHaveLength(1);
      });

      it('sets distribution status to in_progress', async () => {
        expect(result[0].status).toBe(DistributionStatus.in_progress);
      });
    });
  });

  describe('when distributing recipes via package', () => {
    let recipesPackage1: Package;

    beforeEach(async () => {
      // Mock the git commit to prevent actual git operations
      commit = await createGitCommit();
      commitToGit = jest.fn().mockResolvedValue(commit);
      const gitAdapter = testApp.gitHexa.getAdapter();
      jest.spyOn(gitAdapter, 'commitToGit').mockImplementation(commitToGit);

      recipesPackage1 = await createPackage([], [recipe1], 'Recipes Package 1');
    });

    describe('when distributing a single package', () => {
      let result: PackagesDeployment[];

      beforeEach(async () => {
        result = await distributePackage(recipesPackage1);
      });

      it('creates exactly one distribution', async () => {
        expect(result).toHaveLength(1);
      });

      it('sets distribution status to in_progress', async () => {
        expect(result[0].status).toBe(DistributionStatus.in_progress);
      });
    });

    describe('when a new package is distributed', () => {
      let result: PackagesDeployment[];

      beforeEach(async () => {
        await distributePackage(recipesPackage1);
        const recipesPackage2 = await createPackage(
          [],
          [recipe2],
          'Recipes Package 2',
        );
        result = await distributePackage(recipesPackage2);
      });

      it('creates exactly one distribution', async () => {
        expect(result).toHaveLength(1);
      });

      it('sets distribution status to in_progress', async () => {
        expect(result[0].status).toBe(DistributionStatus.in_progress);
      });
    });

    describe('when a distributed recipe has been deleted', () => {
      let result: PackagesDeployment[];

      beforeEach(async () => {
        await testApp.recipesHexa.getAdapter().deleteRecipe({
          ...dataFactory.packmindCommand(),
          recipeId: recipe1.id,
          spaceId: recipe1.spaceId,
        });
        await distributePackage(recipesPackage1);
        const recipesPackage2 = await createPackage(
          [],
          [recipe2],
          'Recipes Package 2',
        );
        result = await distributePackage(recipesPackage2);
      });

      it('creates exactly one distribution', async () => {
        expect(result).toHaveLength(1);
      });

      it('sets distribution status to in_progress', async () => {
        expect(result[0].status).toBe(DistributionStatus.in_progress);
      });
    });
  });
});
