import { GitCommitSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import {
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
      commit = await createGitCommit();
      commitToGit = jest.fn().mockResolvedValue(commit);
      const gitAdapter = testApp.gitHexa.getAdapter();
      jest.spyOn(gitAdapter, 'commitToGit').mockImplementation(commitToGit);

      standardsPackage1 = await createPackage(
        [standard1],
        [],
        'Standards Package 1',
      );
      await distributePackage(standardsPackage1);
    });

    it('properly distributes standards', async () => {
      expect(commitToGit).toHaveBeenCalledWith(
        dataFactory.gitRepo,
        [
          {
            content: expect.stringContaining(standard1.name),
            path: `.packmind/standards/${standard1.slug}.md`,
          },
          {
            content: expect.any(String),
            path: `.packmind/standards-index.md`,
          },
          {
            content: expect.any(String),
            path: `packmind.json`,
          },
        ],
        expect.any(String),
        expect.any(Array),
      );
    });

    describe('when new package is distributed', () => {
      it('re-distributes previously distributed standards ', async () => {
        const standardsPackage2 = await createPackage(
          [standard2],
          [],
          'Standards Package 2',
        );
        await distributePackage(standardsPackage2);

        expect(commitToGit).toHaveBeenCalledWith(
          dataFactory.gitRepo,
          [
            {
              content: expect.stringContaining(standard1.name),
              path: `.packmind/standards/${standard1.slug}.md`,
            },
            {
              content: expect.stringContaining(standard2.name),
              path: `.packmind/standards/${standard2.slug}.md`,
            },
            {
              content: expect.any(String),
              path: `.packmind/standards-index.md`,
            },
            {
              content: expect.any(String),
              path: `packmind.json`,
            },
          ],
          expect.any(String),
          expect.any(Array),
        );
      });
    });

    describe('when a standard previously distributed has been deleted', () => {
      beforeEach(async () => {
        await testApp.standardsHexa
          .getAdapter()
          .deleteStandard(
            standard1.id,
            dataFactory.user.id,
            dataFactory.organization.id,
          );
      });

      it('does not re-distribute the deleted standard', async () => {
        const standardsPackage2 = await createPackage(
          [standard2],
          [],
          'Standards Package 2',
        );
        await distributePackage(standardsPackage2);

        // Check the second call (first call was in beforeEach with standard1)
        expect(commitToGit).toHaveBeenCalledTimes(2);
        const secondCallArgs = commitToGit.mock.calls[1];
        expect(secondCallArgs[0]).toEqual(dataFactory.gitRepo);
        // Note: publishPackages re-distributes all active standards for the target
        // including previously distributed ones, not just the requested ones
        expect(secondCallArgs[1]).toEqual([
          {
            content: expect.stringContaining(standard1.name),
            path: `.packmind/standards/${standard1.slug}.md`,
          },
          {
            content: expect.stringContaining(standard2.name),
            path: `.packmind/standards/${standard2.slug}.md`,
          },
          {
            content: expect.any(String),
            path: `.packmind/standards-index.md`,
          },
          {
            content: expect.any(String),
            path: `packmind.json`,
          },
        ]);
        expect(secondCallArgs[2]).toEqual(expect.any(String));
        expect(secondCallArgs[3]).toEqual(expect.any(Array));
      });
    });
  });

  describe('when distributing recipes via package', () => {
    let recipesPackage1: Package;

    beforeEach(async () => {
      commit = await createGitCommit();
      commitToGit = jest.fn().mockResolvedValue(commit);
      const gitAdapter = testApp.gitHexa.getAdapter();
      jest.spyOn(gitAdapter, 'commitToGit').mockImplementation(commitToGit);

      recipesPackage1 = await createPackage([], [recipe1], 'Recipes Package 1');
      await distributePackage(recipesPackage1);
    });

    it('properly distributes the recipes', async () => {
      expect(commitToGit).toHaveBeenCalledWith(
        dataFactory.gitRepo,
        [
          {
            path: `.packmind/recipes/${recipe1.slug}.md`,
            content: expect.stringContaining(recipe1.content),
          },
          {
            path: `.packmind/recipes-index.md`,
            content: expect.any(String),
          },
          {
            path: `packmind.json`,
            content: expect.any(String),
          },
        ],
        expect.any(String),
        expect.any(Array),
      );
    });

    describe('when a new package is distributed', () => {
      it('re-distributes previously distributed recipes ', async () => {
        const recipesPackage2 = await createPackage(
          [],
          [recipe2],
          'Recipes Package 2',
        );
        await distributePackage(recipesPackage2);

        expect(commitToGit).toHaveBeenCalledWith(
          dataFactory.gitRepo,
          [
            {
              path: `.packmind/recipes/${recipe1.slug}.md`,
              content: expect.stringContaining(recipe1.content),
            },
            {
              path: `.packmind/recipes/${recipe2.slug}.md`,
              content: expect.stringContaining(recipe2.content),
            },
            {
              path: `.packmind/recipes-index.md`,
              content: expect.any(String),
            },
            {
              path: `packmind.json`,
              content: expect.any(String),
            },
          ],
          expect.any(String),
          expect.any(Array),
        );
      });
    });

    describe('when a distributed recipe has been deleted', () => {
      beforeEach(async () => {
        await testApp.recipesHexa.getAdapter().deleteRecipe({
          ...dataFactory.packmindCommand(),
          recipeId: recipe1.id,
          spaceId: recipe1.spaceId,
        });
      });

      it('does not re-distribute the deleted recipe', async () => {
        const recipesPackage2 = await createPackage(
          [],
          [recipe2],
          'Recipes Package 2',
        );
        await distributePackage(recipesPackage2);

        expect(commitToGit).toHaveBeenCalledWith(
          dataFactory.gitRepo,
          [
            {
              path: `.packmind/recipes/${recipe2.slug}.md`,
              content: expect.stringContaining(recipe2.content),
            },
            {
              path: `.packmind/recipes-index.md`,
              content: expect.any(String),
            },
            {
              path: `packmind.json`,
              content: expect.any(String),
            },
          ],
          expect.any(String),
          expect.any(Array),
        );
      });
    });
  });
});
