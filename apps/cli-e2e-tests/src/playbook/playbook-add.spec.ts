import {
  describeWithUserSignedUp,
  describeForVersion,
  RunCliResult,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from '../helpers';
import fs from 'fs';
import {
  createSpaceId,
  createStandardId,
  PackmindLockFile,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

describeForVersion('> 0.24.0', 'playbook add', () => {
  describeWithUserSignedUp('playbook add', (getContext) => {
    let context: UserSignedUpContext;

    beforeEach(async () => {
      context = await getContext();
      await setupGitRepo(context.testDir);

      updateFile(
        'packmind.json',
        JSON.stringify({ packages: {} }),
        context.testDir,
      );

      fs.mkdirSync(`${context.testDir}/.packmind/standards/`, {
        recursive: true,
      });
    });

    describe('when an artifact comes from a private space', () => {
      beforeEach(() => {
        updateFile(
          'packmind.json',
          JSON.stringify({
            packages: {
              '@private/secret': '*',
            },
          }),
          context.testDir,
        );

        updateFile(
          '.packmind/standards/secret-standard.md',
          '# Secret standard',
          context.testDir,
        );

        const lockFile: PackmindLockFile = {
          agents: [],
          artifacts: {
            'standard:secret-standard': {
              name: 'Secret standard',
              type: 'standard',
              spaceId: createSpaceId(uuidv4()),
              id: createStandardId(uuidv4()),
              packageIds: [],
              version: 3,
              files: [
                {
                  path: '.packmind/standards/secret-standard.md',
                  agent: 'packmind',
                },
              ],
            },
          },
          installedAt: '',
          lockfileVersion: 0,
          packageSlugs: ['@private/secret'],
        };
        updateFile(
          'packmind-lock.json',
          JSON.stringify(lockFile),
          context.testDir,
        );
      });

      it('can not be added to the playbook change proposals', async () => {
        const cliResult = await context.runCli(
          'playbook add .packmind/standards/secret-standard.md',
        );

        expect(cliResult).toEqual({
          returnCode: 1,
          stderr: expect.stringContaining(
            'Cannot add changes to this standard: the space it belongs to is not available to you',
          ),
          stdout: '',
        });
      });

      it('can be added as a creation in another space the user belongs to', async () => {
        const cliResult = await context.runCli(
          `playbook add .packmind/standards/secret-standard.md --space ${context.space.slug}`,
        );

        expect(cliResult).toEqual({
          returnCode: 0,
          stderr: '',
          stdout: expect.stringContaining(
            `Staged "Secret standard" (standard, created) to playbook in space "${context.space.name}".`,
          ),
        });
      });
    });
  });
});

describeForVersion('0.24.0', 'playbook add and submit for CLI <= 0.24.0', () => {
  describeWithUserSignedUp('playbook add and submit for CLI <= 0.24.0', (getContext) => {
    let context: UserSignedUpContext;

    beforeEach(async () => {
      context = await getContext();
      await setupGitRepo(context.testDir);

      updateFile(
        'packmind.json',
        JSON.stringify({ packages: {} }),
        context.testDir,
      );

      fs.mkdirSync(`${context.testDir}/.packmind/standards/`, {
        recursive: true,
      });
    });

    describe('when targeting the default space', () => {
      let addResult: RunCliResult;
      let submitResult: RunCliResult;

      beforeEach(async () => {
        updateFile(
          '.packmind/standards/default-space-standard.md',
          '# Default space standard\n\nWith a description:\n\n* rule 1\n* rule 2\n',
          context.testDir,
        );

        addResult = await context.runCli(
          'playbook add .packmind/standards/default-space-standard.md',
        );
        submitResult = await context.runCli(
          'playbook submit -m "Add standard to default space"',
        );
      });

      it('adds the standard to the playbook', () => {
        expect(addResult).toEqual({
          returnCode: 0,
          stderr: '',
          stdout: expect.stringContaining('Staged'),
        });
      });

      it('rejects the submit with a community edition error', () => {
        expect(submitResult.returnCode).toBe(1);
      });

      it('returns an error message about change proposals not being available', () => {
        expect(submitResult.stderr).toEqual(
          expect.stringContaining(
            'change proposals',
          ),
        );
      });

      it('suggests using --no-review as an alternative', () => {
        expect(submitResult.stdout).toEqual(
          expect.stringContaining('--no-review'),
        );
      });
    });
  });
});
