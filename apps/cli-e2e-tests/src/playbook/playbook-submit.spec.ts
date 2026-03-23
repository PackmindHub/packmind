import {
  describeWithUserSignedUp,
  readFile,
  updateFile,
  setupGitRepo,
  UserSignedUpContext,
} from '../helpers';
import { Standard } from '@packmind/types';

describeWithUserSignedUp('playbook submit command', (getContext) => {
  let context: UserSignedUpContext;

  beforeEach(async () => {
    context = await getContext();
    await setupGitRepo(context.testDir);
  });

  describe('when a deployed standard is modified, staged, and submitted with -m flag', () => {
    let standard: Standard;

    beforeEach(async () => {
      // Create a standard via API
      standard = (await context.gateway.standards.create({
        name: 'My standard',
        description: 'A test standard description.',
        rules: [{ content: 'Always use const' }],
        scope: null,
        spaceId: context.space.id,
      })) as unknown as Standard;

      // Create a package containing the standard
      const createPackageResponse = await context.gateway.packages.create({
        name: 'My package',
        description: 'Test package for playbook',
        recipeIds: [],
        standardIds: [standard.id],
        spaceId: context.space.id,
      });

      // Install the package locally (deploys the standard file)
      const installResult = await context.runCli(
        `install ${createPackageResponse.package.slug}`,
      );

      if (installResult.returnCode !== 0) {
        throw new Error(
          `Failed to install package: ${installResult.stderr || installResult.stdout}`,
        );
      }

      // Find the deployed standard file
      const { execSync } = await import('child_process');
      const files = execSync(
        `find ${context.testDir} -name "*.md" -not -path "*/.git/*"`,
      )
        .toString()
        .trim()
        .split('\n')
        .filter(Boolean);

      const standardFile = files.find((f) => f.includes(standard.slug));
      if (!standardFile) {
        throw new Error(
          `Standard file not found after install. Files: ${files.join(', ')}`,
        );
      }
      const standardPath = standardFile.replace(`${context.testDir}/`, '');

      // Modify the deployed standard file
      const originalContent = readFile(standardPath, context.testDir);
      updateFile(
        standardPath,
        `${originalContent}\n* Never use var`,
        context.testDir,
      );

      // Stage the change
      const addResult = await context.runCli(`playbook add ${standardPath}`);

      if (addResult.returnCode !== 0) {
        throw new Error(
          `Failed to add to playbook: ${addResult.stderr || addResult.stdout}`,
        );
      }

      // Submit with -m flag
      await context.runCli('playbook submit -m "My changes"');
    });

    it('creates change proposals in packmind', async () => {
      const proposals = await context.gateway.changeProposals.listBySpace({
        spaceId: context.space.id,
      });

      const hasStandardProposals = proposals.standards.some(
        (s) => s.artefactId === standard.id,
      );
      expect(hasStandardProposals).toBe(true);
    });
  });
});
