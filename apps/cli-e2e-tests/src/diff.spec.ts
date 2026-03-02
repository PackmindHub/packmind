import {
  describeWithUserSignedUp,
  runCli,
  updateFile,
  readFile,
} from './helpers';
import { setupGitRepo } from './helpers/setupGitRepo';
import { IPackmindGateway } from './helpers/IPackmindGateway';
import { SpaceId } from '@packmind/types';

describeWithUserSignedUp('diff command', (getContext) => {
  let gateway: IPackmindGateway;
  let apiKey: string;
  let testDir: string;
  let spaceId: SpaceId;
  let commandSlug: string;
  let command2Slug: string;

  beforeEach(async () => {
    const context = await getContext();
    await setupGitRepo(context.testDir);

    apiKey = context.apiKey;
    testDir = context.testDir;
    spaceId = context.spaceId;
    gateway = context.gateway;

    // Create two commands
    const command1 = await gateway.commands.create({
      name: 'My command',
      content: '# My Command\n\nThis is my command content.',
      spaceId,
    });
    commandSlug = command1.slug;

    const command2 = await gateway.commands.create({
      name: 'My second command',
      content: '# My Second Command\n\nThis is my second command content.',
      spaceId,
    });
    command2Slug = command2.slug;

    // Create a package with both commands
    const createPackageResponse = await gateway.packages.create({
      name: 'My package',
      description: 'Test package for diff command',
      recipeIds: [command1.id, command2.id],
      standardIds: [],
      spaceId,
    });

    // Install the package locally
    const installResult = await runCli(
      `install ${createPackageResponse.package.slug}`,
      {
        apiKey,
        cwd: testDir,
      },
    );

    if (installResult.returnCode !== 0) {
      throw new Error(
        `Failed to install package: ${installResult.stderr || installResult.stdout}`,
      );
    }
  });

  describe('when submitting a command content change', () => {
    let returnCode: number;
    let stdout: string;

    beforeEach(async () => {
      // Read the command file and append new content
      const commandPath = `.packmind/commands/${commandSlug}.md`;
      const originalContent = await readFile(commandPath, testDir);
      await updateFile(
        commandPath,
        `${originalContent}\n\nSome new content here`,
        testDir,
      );

      // Submit the diff
      const result = await runCli('diff --submit -m "My changes"', {
        apiKey,
        cwd: testDir,
      });

      returnCode = result.returnCode;
      stdout = result.stdout;
    });

    it('succeeds', () => {
      expect(returnCode).toEqual(0);
    });

    it('tells the user that the change was properly submitted', () => {
      expect(stdout).toContain('Summary: 1 submitted');
    });

    describe('when creating another change', () => {
      let secondChangeReturnCode: number;
      let secondChangeStdout: string;

      beforeEach(async () => {
        // Make another change to the same command
        const commandPath = `.packmind/commands/${command2Slug}.md`;
        const currentContent = await readFile(commandPath, testDir);
        await updateFile(
          commandPath,
          `${currentContent}\n\nYet another new content`,
          testDir,
        );
      });

      describe('when using diff (without flags)', () => {
        beforeEach(async () => {
          const result = await runCli('diff', {
            apiKey,
            cwd: testDir,
          });

          secondChangeReturnCode = result.returnCode;
          secondChangeStdout = result.stdout;
        });

        it('succeeds', () => {
          expect(secondChangeReturnCode).toEqual(0);
        });

        it('excludes the previously submitted proposal', () => {
          expect(secondChangeStdout).not.toContain('Some new content here');
        });

        it('shows the new proposal', () => {
          expect(secondChangeStdout).toContain('Yet another new content');
        });
      });

      describe('when using diff --include-submitted', () => {
        beforeEach(async () => {
          const result = await runCli('diff --include-submitted', {
            apiKey,
            cwd: testDir,
          });
          secondChangeReturnCode = result.returnCode;
          secondChangeStdout = result.stdout;
        });

        it('succeeds', () => {
          expect(secondChangeReturnCode).toEqual(0);
        });

        it('shows the previously submitted proposal', () => {
          // Both the submitted and new changes should be shown
          expect(secondChangeStdout.split('\n')).toEqual(
            expect.arrayContaining([
              expect.stringContaining('Some new content here'),
              expect.stringContaining('Yet another new content'),
            ]),
          );
        });
      });

      describe('when using diff --submit again', () => {
        beforeEach(async () => {
          const result = await runCli('diff --submit -m "Some changes"', {
            apiKey,
            cwd: testDir,
          });
          secondChangeReturnCode = result.returnCode;
          secondChangeStdout = result.stdout;
        });

        it('succeeds', () => {
          expect(secondChangeReturnCode).toEqual(0);
        });

        it('only submits the newly created change proposal', () => {
          // Should create one new proposal for the new changes
          expect(secondChangeStdout).toContain('Summary: 1 submitted');
        });
      });
    });
  });

  describe('when no changes are made', () => {
    let returnCode: number;
    let stdout: string;

    beforeEach(async () => {
      const result = await runCli('diff', {
        apiKey,
        cwd: testDir,
      });
      returnCode = result.returnCode;
      stdout = result.stdout;
    });

    it('succeeds', () => {
      expect(returnCode).toEqual(0);
    });

    it('indicates no changes', () => {
      expect(stdout).toContain('No changes');
    });
  });
});
