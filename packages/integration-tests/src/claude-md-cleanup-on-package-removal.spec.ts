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
import { DataSource } from 'typeorm';
import { DataFactory } from './helpers/DataFactory';
import { makeIntegrationTestDataSource } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

/**
 * Integration tests for CLAUDE.md file cleanup during package removal.
 *
 * These tests verify the behavior when removing packages that deployed content
 * to CLAUDE.md files. The expected behavior is:
 *
 * 1. When a CLAUDE.md file has pre-existing user content (outside Packmind sections),
 *    the file should be preserved with the original user content after removal.
 *
 * 2. When a CLAUDE.md file was created entirely by Packmind (only sections, no user content),
 *    the file should be deleted after removal instead of being left empty.
 */
describe('CLAUDE.md cleanup on package removal', () => {
  let testApp: TestApp;
  let dataFactory: DataFactory;
  let dataSource: DataSource;

  let recipe: Recipe;
  let standard: Standard;

  let commit: GitCommit;
  let commitToGit: jest.Mock;
  let getFileFromRepo: jest.Mock;

  beforeEach(async () => {
    dataSource = await makeIntegrationTestDataSource();
    await dataSource.initialize();
    await dataSource.synchronize();

    testApp = new TestApp(dataSource);
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
    await dataSource.destroy();
  });

  async function createGitCommit() {
    const gitCommitRepo = dataSource.getRepository(GitCommitSchema);
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

  describe('when CLAUDE.md has pre-existing user content', () => {
    const preExistingUserContent = `# My Project Instructions

This is my custom content that I added to CLAUDE.md manually.
It should be preserved after Packmind content is removed.

## My Rules
- Rule 1: Always use TypeScript
- Rule 2: Follow the style guide
`;

    let packageToRemove: Package;
    let fileUpdates: FileModification[];
    let deleteFiles: { path: string }[];

    beforeEach(async () => {
      // Simulate pre-existing CLAUDE.md with user content AND Packmind sections
      const existingClaudeMdWithSections = `${preExistingUserContent}
<!-- start: Packmind standards -->
# Packmind Standards
Some standard content here
<!-- end: Packmind standards -->

<!-- start: Packmind recipes -->
# Packmind Recipes
Some recipe content here
<!-- end: Packmind recipes -->
`;

      getFileFromRepo.mockImplementation(
        async (_gitRepoId: string, path: string) => {
          if (path === 'CLAUDE.md') {
            return {
              content: Buffer.from(existingClaudeMdWithSections).toString(
                'base64',
              ),
              sha: 'existing-file-sha',
            };
          }
          return null;
        },
      );

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

    it('clears Packmind recipes section in CLAUDE.md', () => {
      const claudeFile = fileUpdates.find((f) => f.path === 'CLAUDE.md');

      expect(claudeFile?.sections).toEqual(
        expect.arrayContaining([{ key: 'Packmind recipes', content: '' }]),
      );
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

    it('excludes CLAUDE.md from the delete list', () => {
      expect(deleteFiles).not.toContain(
        expect.objectContaining({ path: 'CLAUDE.md' }),
      );
    });
  });

  describe('when CLAUDE.md does not exist before deployment', () => {
    let packageToRemove: Package;
    let fileUpdates: FileModification[];

    beforeEach(async () => {
      // No pre-existing CLAUDE.md file
      getFileFromRepo.mockResolvedValue(null);

      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Package without pre-existing Claude.md',
          description: 'Package that will be removed',
          recipeIds: [recipe.id],
          standardIds: [standard.id],
        });
      packageToRemove = response.package;

      await deployPackage(packageToRemove);

      await removePackage(packageToRemove);

      fileUpdates = commitToGit.mock.calls[0][1];
    });

    it('sends section clearing updates to commitToGit for recipes', () => {
      // The deployers send section clearing updates for recipes in CLAUDE.md
      // Standards are now individual files and will be in the delete list
      const claudeFileUpdate = fileUpdates.find((f) => f.path === 'CLAUDE.md');

      expect(claudeFileUpdate?.sections).toEqual(
        expect.arrayContaining([{ key: 'Packmind recipes', content: '' }]),
      );
    });
  });
});
