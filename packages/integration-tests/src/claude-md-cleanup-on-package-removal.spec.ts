import { GitCommitSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import {
  FileModification,
  GitCommit,
  Package,
  Recipe,
  RenderMode,
  Standard,
} from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

/**
 * Integration tests for Claude Code cleanup during package removal.
 *
 * These tests verify the behavior when removing packages that deployed content
 * to Claude Code. The expected behavior is:
 *
 * 1. Individual recipe command files at .claude/commands/packmind/{slug}.md are deleted.
 *
 * 2. The .claude/commands/packmind/ folder is deleted when all recipes are removed.
 *
 * 3. Individual standard rule files at .claude/rules/packmind/standard-{slug}.md are deleted.
 *
 * 4. The .claude/rules/packmind/ folder is deleted when all artifacts are removed.
 *
 * 5. CLAUDE.md legacy sections are cleared (Packmind standards and recipes sections set to empty).
 */
describe('CLAUDE.md cleanup on package removal', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;

  let recipe: Recipe;
  let standard: Standard;

  let commit: GitCommit;
  let commitToGit: jest.Mock;
  let getFileFromRepo: jest.Mock;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    dataFactory = new DataFactory(testApp);
    await dataFactory.withUserAndOrganization();
    await dataFactory.withGitRepo();
    await dataFactory.withRenderMode([RenderMode.CLAUDE]);

    recipe = await dataFactory.withRecipe({ name: 'Test Recipe' });
    standard = await dataFactory.withStandard({ name: 'Test Standard' });

    commit = await createGitCommit();
    commitToGit = jest.fn().mockResolvedValue(commit);
    const gitAdapter = testApp.gitHexa.getAdapter();
    jest.spyOn(gitAdapter, 'commitToGit').mockImplementation(commitToGit);

    getFileFromRepo = jest.fn();
    jest
      .spyOn(gitAdapter, 'getFileFromRepo')
      .mockImplementation(getFileFromRepo);
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

  async function deployPackage(pkg: Package) {
    await testApp.deploymentsHexa.getAdapter().publishPackages({
      ...dataFactory.packmindCommand(),
      packageIds: [pkg.id],
      targetIds: [dataFactory.target.id],
    });
    commitToGit.mockClear();
  }

  async function removePackage(pkg: Package) {
    await testApp.deploymentsHexa.getAdapter().removePackageFromTargets({
      ...dataFactory.packmindCommand(),
      packageId: pkg.id,
      targetIds: [dataFactory.target.id],
    });
  }

  describe('when removing a package with recipes and standards', () => {
    let packageToRemove: Package;
    let fileUpdates: FileModification[];
    let deleteFiles: { path: string }[];

    beforeEach(async () => {
      // No pre-existing files
      getFileFromRepo.mockResolvedValue(null);

      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Package with Claude content',
          description: 'Package that will be removed',
          recipeIds: [recipe.id],
          standardIds: [standard.id],
        });
      packageToRemove = response.package;

      await deployPackage(packageToRemove);

      await removePackage(packageToRemove);

      fileUpdates = commitToGit.mock.calls[0][1];
      deleteFiles = commitToGit.mock.calls[0][3];
    });

    it('deletes recipe command file', () => {
      expect(deleteFiles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '.claude/commands/packmind/test-recipe.md',
          }),
        ]),
      );
    });

    describe('when all recipes removed', () => {
      it('deletes commands folder', () => {
        expect(deleteFiles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: '.claude/commands/packmind/',
            }),
          ]),
        );
      });
    });

    it('deletes individual standard files', () => {
      expect(deleteFiles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '.claude/rules/packmind/standard-test-standard.md',
          }),
        ]),
      );
    });

    describe('when all artifacts removed', () => {
      it('deletes rules folder', () => {
        expect(deleteFiles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: '.claude/rules/packmind/',
            }),
          ]),
        );
      });
    });

    it('clears legacy CLAUDE.md sections', () => {
      expect(fileUpdates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'CLAUDE.md',
            sections: expect.arrayContaining([
              expect.objectContaining({
                key: 'Packmind standards',
                content: '',
              }),
              expect.objectContaining({
                key: 'Packmind recipes',
                content: '',
              }),
            ]),
          }),
        ]),
      );
    });
  });

  describe('when removing only recipes (no standards)', () => {
    let packageToRemove: Package;
    let deleteFiles: { path: string }[];

    beforeEach(async () => {
      // No pre-existing files
      getFileFromRepo.mockResolvedValue(null);

      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Package with only recipe',
          description: 'Package that will be removed',
          recipeIds: [recipe.id],
          standardIds: [],
        });
      packageToRemove = response.package;

      await deployPackage(packageToRemove);

      await removePackage(packageToRemove);

      deleteFiles = commitToGit.mock.calls[0][3];
    });

    it('deletes recipe command file', () => {
      expect(deleteFiles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '.claude/commands/packmind/test-recipe.md',
          }),
        ]),
      );
    });

    describe('when all recipes removed', () => {
      it('deletes commands folder', () => {
        expect(deleteFiles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: '.claude/commands/packmind/',
            }),
          ]),
        );
      });
    });

    describe('when all artifacts removed', () => {
      it('deletes rules folder', () => {
        expect(deleteFiles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: '.claude/rules/packmind/',
            }),
          ]),
        );
      });
    });
  });
});
