import {
  describeWithUserSignedUp,
  RunCliResult,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from '../helpers';
import fs from 'fs';
import {
  createSpaceId,
  createStandardId,
  Package,
  PackmindLockFile,
  Standard,
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

    describe('when an artefact comes from a private space', () => {
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

    describe('when an artefact comes from a space the user can access', () => {
      let rmResult: RunCliResult;
      let standard: Standard;
      let pkg: Package;

      beforeEach(async () => {
        const createStandardResponse = await context.gateway.standards.create({
          description: 'Some standard',
          name: 'My super standard',
          rules: [],
          scope: '',
          spaceId: context.space.id,
        });
        standard = createStandardResponse.standard;

        const createPackageResponse = await context.gateway.packages.create({
          description: '',
          name: 'My package',
          recipeIds: [],
          spaceId: context.space.id,
          standardIds: [standard.id],
        });
        pkg = createPackageResponse.package;

        await context.runCli(`install @${context.space.slug}/${pkg.slug}`);
        rmResult = await context.runCli(
          `playbook rm .packmind/standards/${standard.slug}.md`,
        );
      });

      it('succeeds', () => {
        expect(rmResult).toEqual({
          returnCode: 0,
          stderr: '',
          stdout: expect.stringContaining(
            `Staged "${standard.name}" (standard, removed) to playbook in space "${context.space.name}"`,
          ),
        });
      });

      describe('when user submits the changes', () => {
        let submitResult: RunCliResult;

        beforeEach(async () => {
          submitResult = await context.runCli('playbook submit --no-review');
        });

        it('does not delete the artefacts', async () => {
          const { standards } = await context.gateway.standards.list({
            spaceId: context.space.id,
          });

          expect(standards).toEqual([expect.objectContaining(standard)]);
        });

        it('does not remove the artefact from packages', async () => {
          const { packages } = await context.gateway.packages.list({
            spaceId: context.space.id,
          });

          expect(packages).toEqual([
            expect.objectContaining({
              standards: [standard.id],
            }),
          ]);
        });

        it('warns the user that some actions could not be done and provides link to manage the packages', () => {
          expect(submitResult).toEqual({
            returnCode: 0,
            stderr: expect.stringContaining(
              'Some changes could not be applied: playbook submit does not allow remove artefacts. Review the following affected packages:',
            ),
            stdout: expect.stringContaining(
              `${pkg.name}: http://localhost:4200/org/${context.organization.slug}/space/${context.space.slug}/packages/${pkg.id}`,
            ),
          });
        });
      });
    });
  });
});
