import {
  describeWithUserSignedUp,
  readFile,
  RunCliResult,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from '../helpers';
import { PackmindLockFile } from '@packmind/types';
import fs from 'fs';

describeWithUserSignedUp('playbook submit --no-review', (getContext) => {
  let context: UserSignedUpContext;

  beforeEach(async () => {
    context = await getContext();
    await setupGitRepo(context.testDir);

    updateFile(
      'packmind.json',
      JSON.stringify({ packages: {} }),
      context.testDir,
    );
  });

  describe('when creating new artefacts using `playbook add`command', () => {
    let playbookSubmitResult: RunCliResult;

    beforeEach(async () => {
      fs.mkdirSync(`${context.testDir}/.packmind/standards/`, {
        recursive: true,
      });
      updateFile(
        `.packmind/standards/my-standard.md`,
        `# My new standard
        
With a description:

* rule 1
* rule 2
`,
        context.testDir,
      );

      await context.runCli(`playbook add .packmind/standards/my-standard.md`);
      playbookSubmitResult = await context.runCli(
        `playbook submit --no-review`,
      );
    });

    it('succeeds', () => {
      expect(playbookSubmitResult).toEqual({
        returnCode: 0,
        stderr: '',
        stdout: expect.stringMatching('1 standard created'),
      });
    });

    it('creates the new artefact', async () => {
      const standards = await context.gateway.standards.list({
        spaceId: context.space.id,
      });

      expect(standards).toEqual({
        standards: [
          expect.objectContaining({
            name: 'My new standard',
          }),
        ],
      });
    });
  });

  describe('when updating an existing artifact using playbook submit --no-review', () => {
    let playbookSubmitResult: RunCliResult;
    let packageSlug: string;
    let standardFilePath: string;

    beforeEach(async () => {
      const createResult = await context.gateway.standards.create({
        name: 'Updatable standard',
        description: 'Original description',
        spaceId: context.space.id,
        rules: [{ content: 'Original rule' }],
        scope: null,
      });
      const standardId = createResult.standard.id;

      const packageResult = await context.gateway.packages.create({
        name: 'Update test package',
        description: 'For update test',
        spaceId: context.space.id,
        standardIds: [standardId],
        recipeIds: [],
      });
      packageSlug = packageResult.package.slug;

      await context.runCli(`install ${packageSlug}`);

      const lockFileContent = readFile('packmind-lock.json', context.testDir);
      const lockFile: PackmindLockFile = JSON.parse(lockFileContent);
      const artifact = Object.values(lockFile.artifacts).find(
        (a) => a.type === 'standard' && a.name === 'Updatable standard',
      );
      if (!artifact) {
        throw new Error('Installed standard artifact not found in lock file');
      }
      standardFilePath = artifact.files[0].path;

      updateFile(
        standardFilePath,
        `# Updatable standard\n\nUpdated description\n\n* Updated rule`,
        context.testDir,
      );

      await context.runCli(`playbook add ${standardFilePath}`);
      playbookSubmitResult = await context.runCli(
        'playbook submit --no-review',
      );
    });

    it('succeeds', () => {
      expect(playbookSubmitResult).toEqual({
        returnCode: 0,
        stderr: '',
        stdout: expect.stringMatching('1 standard updated'),
      });
    });

    it('updates the artifact on the server', async () => {
      await context.runCli(`install ${packageSlug}`);

      const content = readFile(standardFilePath, context.testDir);
      expect(content).toContain('Updated rule');
    });
  });
});
