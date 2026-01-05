import { GitCommitSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import {
  GitCommit,
  Package,
  Recipe,
  RenderMode,
  Standard,
  createPackageId,
  createTargetId,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { DataFactory } from './helpers/DataFactory';
import { makeIntegrationTestDataSource } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

describe('Package removal from target integration', () => {
  let testApp: TestApp;
  let dataFactory: DataFactory;
  let dataSource: DataSource;

  let recipe1: Recipe;
  let standard1: Standard;

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
    await dataFactory.withRenderMode([
      RenderMode.PACKMIND,
      RenderMode.CURSOR,
      RenderMode.CLAUDE,
    ]);

    recipe1 = await dataFactory.withRecipe({ name: 'Recipe 1' });
    standard1 = await dataFactory.withStandard({ name: 'Standard 1' });

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

  describe('when removing a package with exclusive artifacts', () => {
    let packageToRemove: Package;
    let fileUpdates: Array<{ path: string; content: string }>;
    let deleteFiles: Array<{ path: string }>;

    beforeEach(async () => {
      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Package to Remove',
          description: 'Package that will be removed',
          recipeIds: [recipe1.id],
          standardIds: [standard1.id],
        });
      packageToRemove = response.package;

      await testApp.deploymentsHexa.getAdapter().publishPackages({
        ...dataFactory.packmindCommand(),
        packageIds: [packageToRemove.id],
        targetIds: [dataFactory.target.id],
      });

      commitToGit.mockClear();

      // Execute removal once and store results
      await testApp.deploymentsHexa.getAdapter().removePackageFromTargets({
        ...dataFactory.packmindCommand(),
        packageId: packageToRemove.id,
        targetIds: [dataFactory.target.id],
      });

      fileUpdates = commitToGit.mock.calls[0][1];
      deleteFiles = commitToGit.mock.calls[0][3];
    });

    it('deletes artifacts files for Cursor, Claude and Packmind', () => {
      expect(deleteFiles).toEqual(
        expect.arrayContaining([
          { path: '.packmind/recipes/recipe-1.md' },
          { path: '.packmind/recipes-index.md' },
          { path: '.packmind/standards/standard-1.md' },
          { path: '.packmind/standards-index.md' },
          { path: '.cursor/rules/packmind/recipes-index.mdc' },
          { path: '.cursor/rules/packmind/standard-standard-1.mdc' },
          { path: '.claude/commands/packmind/recipe-1.md' },
          { path: '.claude/commands/packmind/' },
          { path: '.claude/rules/packmind/standard-standard-1.md' },
          { path: '.claude/rules/packmind/' },
        ]),
      );
    });

    describe('when deleting recipe command files', () => {
      it('does not update CLAUDE.md', () => {
        expect(fileUpdates).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: 'CLAUDE.md',
            }),
          ]),
        );
      });
    });

    it('updates packmind.json', () => {
      expect(fileUpdates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'packmind.json',
            content: expect.not.stringContaining(packageToRemove.slug),
          }),
        ]),
      );
    });
  });

  describe('when removing a package with shared artifacts', () => {
    let packageToRemove: Package;
    let fileUpdates: Array<{ path: string; content: string }>;
    let deleteFiles: Array<{ path: string }>;

    beforeEach(async () => {
      const sharedRecipe = await dataFactory.withRecipe({
        name: 'Shared Recipe',
      });

      const response1 = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Package to Remove',
          description: 'Package that will be removed',
          recipeIds: [recipe1.id, sharedRecipe.id],
          standardIds: [],
        });
      packageToRemove = response1.package;

      const response2 = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Package to Keep',
          description: 'Package that will remain',
          recipeIds: [sharedRecipe.id],
          standardIds: [standard1.id],
        });

      await testApp.deploymentsHexa.getAdapter().publishPackages({
        ...dataFactory.packmindCommand(),
        packageIds: [packageToRemove.id, response2.package.id],
        targetIds: [dataFactory.target.id],
      });

      commitToGit.mockClear();

      // Execute removal once and store results
      await testApp.deploymentsHexa.getAdapter().removePackageFromTargets({
        ...dataFactory.packmindCommand(),
        packageId: packageToRemove.id,
        targetIds: [dataFactory.target.id],
      });

      fileUpdates = commitToGit.mock.calls[0][1];
      deleteFiles = commitToGit.mock.calls[0][3];
    });

    it('deletes exclusive recipe files', () => {
      expect(deleteFiles).toEqual(
        expect.arrayContaining([{ path: '.packmind/recipes/recipe-1.md' }]),
      );
    });

    it('preserves shared recipe files', () => {
      expect(deleteFiles).not.toEqual(
        expect.arrayContaining([
          { path: '.packmind/recipes/shared-recipe.md' },
        ]),
      );
    });

    it('deletes exclusive recipe command file for Claude', () => {
      expect(deleteFiles).toEqual(
        expect.arrayContaining([
          { path: '.claude/commands/packmind/recipe-1.md' },
        ]),
      );
    });

    it('does not delete shared recipe command file for Claude', () => {
      expect(deleteFiles).not.toEqual(
        expect.arrayContaining([
          { path: '.claude/commands/packmind/shared-recipe.md' },
        ]),
      );
    });

    describe('when recipes remain', () => {
      it('does not delete commands folder', () => {
        expect(deleteFiles).not.toEqual(
          expect.arrayContaining([{ path: '.claude/commands/packmind/' }]),
        );
      });
    });

    it('does not update CLAUDE.md', () => {
      expect(fileUpdates).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'CLAUDE.md',
          }),
        ]),
      );
    });

    it('updates packmind.json', () => {
      expect(fileUpdates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'packmind.json',
            content: expect.not.stringContaining(packageToRemove.slug),
          }),
        ]),
      );
    });
  });

  describe('when package does not exist', () => {
    it('throws error with package not found message', async () => {
      const nonExistentPackageId = createPackageId(
        '00000000-0000-0000-0000-000000000000',
      );

      await expect(
        testApp.deploymentsHexa.getAdapter().removePackageFromTargets({
          ...dataFactory.packmindCommand(),
          packageId: nonExistentPackageId,
          targetIds: [dataFactory.target.id],
        }),
      ).rejects.toThrow(/Package.*not found/);
    });
  });

  describe('when target does not exist', () => {
    it('throws error with target not found message', async () => {
      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Test Package',
          description: 'Test package',
          recipeIds: [recipe1.id],
          standardIds: [],
        });

      const nonExistentTargetId = createTargetId(
        '00000000-0000-0000-0000-000000000001',
      );

      await expect(
        testApp.deploymentsHexa.getAdapter().removePackageFromTargets({
          ...dataFactory.packmindCommand(),
          packageId: response.package.id,
          targetIds: [nonExistentTargetId],
        }),
      ).rejects.toThrow(/Target.*not found/);
    });
  });
});
