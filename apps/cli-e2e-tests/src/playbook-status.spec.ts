import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  describeWithUserSignedUp,
  runCli,
  readFile,
  updateFile,
  setupGitRepo,
  IPackmindGateway,
} from './helpers';
import { Space, Standard } from '@packmind/types';

describeWithUserSignedUp('playbook status command', (getContext) => {
  let gateway: IPackmindGateway;
  let apiKey: string;
  let testDir: string;
  let space: Space;
  let sharedHome: string;

  beforeEach(async () => {
    const context = await getContext();
    await setupGitRepo(context.testDir);

    apiKey = context.apiKey;
    testDir = context.testDir;
    space = context.space;
    gateway = context.gateway;
    sharedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-home-'));
  });

  afterEach(() => {
    if (sharedHome && fs.existsSync(sharedHome)) {
      fs.rmSync(sharedHome, { recursive: true, force: true });
    }
  });

  describe('when a deployed standard is modified and staged with playbook add', () => {
    let standard: Standard;
    let statusResult: { returnCode: number; stdout: string; stderr: string };

    beforeEach(async () => {
      // Create a standard via API
      standard = (await gateway.standards.create({
        name: 'My standard',
        description: 'A test standard description.',
        rules: [{ content: 'Always use const' }],
        scope: null,
        spaceId: space.id,
      })) as unknown as Standard;

      // Create a package containing the standard
      const createPackageResponse = await gateway.packages.create({
        name: 'My package',
        description: 'Test package for playbook',
        recipeIds: [],
        standardIds: [standard.id],
        spaceId: space.id,
      });

      // Install the package locally (deploys the standard file)
      const installResult = await runCli(
        `install ${createPackageResponse.package.slug}`,
        { apiKey, cwd: testDir, home: sharedHome },
      );

      if (installResult.returnCode !== 0) {
        throw new Error(
          `Failed to install package: ${installResult.stderr || installResult.stdout}`,
        );
      }

      // Find the deployed standard file
      const { execSync } = await import('child_process');
      const files = execSync(
        `find ${testDir} -name "*.md" -not -path "*/.git/*"`,
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
      const standardPath = standardFile.replace(`${testDir}/`, '');

      // Modify the deployed standard file
      const originalContent = readFile(standardPath, testDir);
      updateFile(standardPath, `${originalContent}\n* Never use var`, testDir);

      // Stage the change
      const addResult = await runCli(`playbook add ${standardPath}`, {
        apiKey,
        cwd: testDir,
        home: sharedHome,
      });

      if (addResult.returnCode !== 0) {
        throw new Error(
          `Failed to add to playbook: ${addResult.stderr || addResult.stdout}`,
        );
      }

      // Run playbook status
      statusResult = await runCli('playbook status', {
        apiKey,
        cwd: testDir,
        home: sharedHome,
      });
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
      const bootstrapStandard = (await gateway.standards.create({
        name: 'Existing standard',
        description: 'Used only to bootstrap the project.',
        rules: [],
        scope: null,
        spaceId: space.id,
      })) as unknown as Standard;

      const createPackageResponse = await gateway.packages.create({
        name: 'Bootstrap package',
        description: 'Bootstrap package for project setup',
        recipeIds: [],
        standardIds: [bootstrapStandard.id],
        spaceId: space.id,
      });

      const installResult = await runCli(
        `install ${createPackageResponse.package.slug}`,
        { apiKey, cwd: testDir, home: sharedHome },
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
        testDir,
      );

      // Stage the new standard
      const addResult = await runCli(
        'playbook add .packmind/standards/react-router.md',
        { apiKey, cwd: testDir, home: sharedHome },
      );

      if (addResult.returnCode !== 0) {
        throw new Error(
          `Failed to add to playbook: ${addResult.stderr || addResult.stdout}`,
        );
      }

      // Run playbook status
      statusResult = await runCli('playbook status', {
        apiKey,
        cwd: testDir,
        home: sharedHome,
      });
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
