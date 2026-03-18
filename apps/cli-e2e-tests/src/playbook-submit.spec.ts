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

describeWithUserSignedUp('playbook submit command', (getContext) => {
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

  describe('when a deployed standard is modified, staged, and submitted with -m flag', () => {
    let standard: Standard;

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

      // Submit with -m flag
      await runCli('playbook submit -m "My changes"', {
        apiKey,
        cwd: testDir,
        home: sharedHome,
      });
    });

    it('creates change proposals in packmind', async () => {
      const proposals = await gateway.changeProposals.listBySpace({
        spaceId: space.id,
      });

      const hasStandardProposals = proposals.standards.some(
        (s) => s.artefactId === standard.id,
      );
      expect(hasStandardProposals).toBe(true);
    });
  });
});
