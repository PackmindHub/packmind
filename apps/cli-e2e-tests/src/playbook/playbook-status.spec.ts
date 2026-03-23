import {
  describeWithUserSignedUp,
  readFile,
  updateFile,
  setupGitRepo,
  UserSignedUpContext,
} from '../helpers';
import { Standard } from '@packmind/types';

describeWithUserSignedUp('playbook status command', (getContext) => {
  let context: UserSignedUpContext;
  beforeEach(async () => {
    context = await getContext();
    await setupGitRepo(context.testDir);
  });

  describe('when a deployed standard is modified and staged with playbook add', () => {
    let standard: Standard;
    let statusResult: { returnCode: number; stdout: string; stderr: string };

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

      // Run playbook status
      statusResult = await context.runCli('playbook status');
    });

    it('succeeds', () => {
      expect(statusResult.returnCode).toBe(0);
    });

    it('shows the "Changes to be submitted:" header', () => {
      expect(statusResult.stdout).toContain('Changes to be submitted:');
    });

    it('shows the standard as updated', () => {
      expect(statusResult.stdout).toContain(
        `Standard "${standard.name}" (updated)`,
      );
    });

    it('shows the submit hint', () => {
      expect(statusResult.stdout).toContain(
        'Use `packmind playbook submit` to send them',
      );
    });
  });

  describe('when a new standard is created and staged with playbook add', () => {
    let statusResult: { returnCode: number; stdout: string; stderr: string };

    beforeEach(async () => {
      // Create a standard and package to establish the project (packmind.json)
      const bootstrapStandard = (await context.gateway.standards.create({
        name: 'Existing standard',
        description: 'Used only to bootstrap the project.',
        rules: [],
        scope: null,
        spaceId: context.space.id,
      })) as unknown as Standard;

      const createPackageResponse = await context.gateway.packages.create({
        name: 'Bootstrap package',
        description: 'Bootstrap package for project setup',
        recipeIds: [],
        standardIds: [bootstrapStandard.id],
        spaceId: context.space.id,
      });

      const installResult = await context.runCli(
        `install ${createPackageResponse.package.slug}`,
      );

      if (installResult.returnCode !== 0) {
        throw new Error(
          `Failed to install package: ${installResult.stderr || installResult.stdout}`,
        );
      }

      // Create a brand new standard file (not deployed by any package)
      updateFile(
        '.packmind/standards/react-router.md',
        '# React router\n\nBest practices for React Router usage.',
        context.testDir,
      );

      // Stage the new standard
      const addResult = await context.runCli(
        'playbook add .packmind/standards/react-router.md',
      );

      if (addResult.returnCode !== 0) {
        throw new Error(
          `Failed to add to playbook: ${addResult.stderr || addResult.stdout}`,
        );
      }

      // Run playbook status
      statusResult = await context.runCli('playbook status');
    });

    it('succeeds', () => {
      expect(statusResult.returnCode).toBe(0);
    });

    it('shows the "Changes to be submitted:" header', () => {
      expect(statusResult.stdout).toContain('Changes to be submitted:');
    });

    it('shows the standard as created', () => {
      expect(statusResult.stdout).toContain(
        'Standard "React router" (created)',
      );
    });

    it('shows the submit hint', () => {
      expect(statusResult.stdout).toContain(
        'Use `packmind playbook submit` to send them',
      );
    });
  });
});
