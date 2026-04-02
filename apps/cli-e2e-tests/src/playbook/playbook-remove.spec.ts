import {
  describeForVersion,
  describeWithUserSignedUp,
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

describe('playbook remove', () => {
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

    describeForVersion('> 0.24.0', 'playbook remove - private space', () => {
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

        it('can not be removed from the playbook', async () => {
          const cliResult = await context.runCli(
            'playbook remove .packmind/standards/secret-standard.md',
          );

          expect(cliResult).toEqual({
            returnCode: 1,
            stderr: expect.stringContaining(
              'Cannot remove this standard: the space it belongs to is not available to you',
            ),
            stdout: '',
          });
        });
      });
    });
  });
});
