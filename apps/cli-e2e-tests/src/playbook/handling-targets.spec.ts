import {
  describeWithUserSignedUp,
  readFile,
  RunCliResult,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from '../helpers';
import { Recipe, Target } from '@packmind/types';
import { recipeFactory } from '@packmind/recipes/test';
import fs from 'fs';

describe('...', () => {
  describeWithUserSignedUp('playbook status command', (getContext) => {
    let context: UserSignedUpContext;

    let command: Recipe;

    let rootTarget: Target;
    let frontendTarget: Target;

    let commandPathInTarget: string;

    beforeEach(async () => {
      context = await getContext();
      await setupGitRepo(context.testDir);
      fs.mkdirSync(`${context.testDir}/apps/frontend`, { recursive: true });

      command = await context.gateway.commands.create(
        recipeFactory({
          spaceId: context.space.id,
          name: 'My command',
          slug: 'my-command',
        }),
      );
      const { package: withRecipe } = await context.gateway.packages.create({
        description: '',
        name: 'My package',
        recipeIds: [command.id],
        spaceId: context.space.id,
        standardIds: [],
      });

      const { package: emptyPackage } = await context.gateway.packages.create({
        description: '',
        name: 'Empty package',
        spaceId: context.space.id,
        recipeIds: [],
        standardIds: [],
      });

      await context.runCli(`install ${emptyPackage.slug}`);
      await context.runCli(`install ${withRecipe.slug} --path apps/frontend`);

      const targets =
        await context.gateway.deployments.getTargetsByOrganization({});
      for (const target of targets) {
        if (target.path === '/') {
          rootTarget = target;
        }

        if (target.path === '/apps/frontend/') {
          frontendTarget = target;
        }
      }

      if (!frontendTarget || !rootTarget) {
        throw new Error(
          `Unable to find targets. Got: ${JSON.stringify(targets)}`,
        );
      }

      commandPathInTarget = `apps/frontend/.packmind/commands/${command.slug}.md`;
      const originalContent = readFile(commandPathInTarget, context.testDir);
      updateFile(
        commandPathInTarget,
        `${originalContent}\n* Never use var`,
        context.testDir,
      );
    });

    describe('when running commands from repo root', () => {
      it('shows the correct path of the change when running diff', async () => {
        const result = await context.runCli('diff');

        expect(result.stdout).toMatchOutput([
          `Command "${command.name}"`,
          commandPathInTarget,
        ]);
      });

      describe('when the file is removed', () => {
        beforeEach(async () => {
          await context.runCli(`playbook remove ${commandPathInTarget}`);
        });

        it('shows the correct path in playbook status', async () => {
          const result = await context.runCli('playbook status');

          expect(result.stdout).toMatchOutput([
            'Changes to be submitted:',
            `Command "${command.name}" (removed) in space "Global" ${commandPathInTarget}`,
          ]);
        });

        describe('when submitting the change', () => {
          beforeEach(async () => {
            await context.runCli('playbook submit -m "Delete command"');
          });

          it('creates a proposal with the correct targetId', async () => {
            const { changeProposals } =
              await context.gateway.changeProposals.listChangeProposalsByRecipe(
                {
                  artefactId: command.id,
                  spaceId: context.space.id,
                },
              );

            expect(changeProposals).toEqual([
              expect.objectContaining({
                artefactId: command.id,
                targetId: frontendTarget.id,
              }),
            ]);
          });
        });
      });

      describe('when the change are added', () => {
        beforeEach(async () => {
          await context.runCli(`playbook add ${commandPathInTarget}`);
        });

        it('shows the correct path in the status', async () => {
          const result = await context.runCli('playbook status');

          expect(result.stdout).toMatchOutput(
            `Command "${command.name}" (updated) in space "Global" ${commandPathInTarget}`,
          );
        });

        describe('when undoing the change', () => {
          let result: RunCliResult;

          beforeEach(async () => {
            result = await context.runCli(
              `playbook unstage ${commandPathInTarget}`,
            );
          });

          it('succeeds', () => {
            expect(result.returnCode).toEqual(0);
          });

          it('does appear as unchanged in the status', async () => {
            const result = await context.runCli('playbook status');

            expect(result.stdout).toMatchOutput([
              'Changes not tracked:',
              `Command "${command.name}" ${commandPathInTarget}`,
            ]);
          });
        });

        describe('when submitting the changes', () => {
          beforeEach(async () => {
            await context.runCli(`playbook submit -m "Some change"`);
          });

          it('creates a proposal with the correct targetId', async () => {
            const { changeProposals } =
              await context.gateway.changeProposals.listChangeProposalsByRecipe(
                {
                  artefactId: command.id,
                  spaceId: context.space.id,
                },
              );

            expect(changeProposals).toEqual([
              expect.objectContaining({
                artefactId: command.id,
                targetId: frontendTarget.id,
              }),
            ]);
          });
        });
      });
    });

    describe('when running commands inside the target', () => {
      let cwd: string;
      let commandPath: string;

      beforeEach(async () => {
        cwd = `${context.testDir}/apps/frontend`;
        commandPath = `.packmind/commands/${command.slug}.md`;
      });

      it('shows the correct path of the change when running diff', async () => {
        const result = await context.runCli('diff', { cwd });

        expect(result.stdout).toMatchOutput([
          `Command "${command.name}"`,
          commandPath,
        ]);
      });

      describe('when the file is removed', () => {
        beforeEach(async () => {
          await context.runCli(`playbook remove ${commandPath}`, { cwd });
        });

        it('shows the correct path in playbook status', async () => {
          const result = await context.runCli('playbook status', { cwd });

          expect(result.stdout).toMatchOutput([
            'Changes to be submitted:',
            `Command "${command.name}" (removed) in space "Global" ${commandPath}`,
          ]);
        });

        describe('when submitting the change', () => {
          beforeEach(async () => {
            await context.runCli('playbook submit -m "Delete command"', {
              cwd,
            });
          });

          it('creates a proposal with the correct targetId', async () => {
            const { changeProposals } =
              await context.gateway.changeProposals.listChangeProposalsByRecipe(
                {
                  artefactId: command.id,
                  spaceId: context.space.id,
                },
              );

            expect(changeProposals).toEqual([
              expect.objectContaining({
                artefactId: command.id,
                targetId: frontendTarget.id,
              }),
            ]);
          });
        });
      });

      describe('when the change are added', () => {
        beforeEach(async () => {
          await context.runCli(`playbook add ${commandPath}`, { cwd });
        });

        it('shows the correct path in the status', async () => {
          const result = await context.runCli('playbook status', { cwd });

          expect(result.stdout).toMatchOutput(
            `Command "${command.name}" (updated) in space "Global" ${commandPath}`,
          );
        });

        describe('when undoing the change', () => {
          let result: RunCliResult;

          beforeEach(async () => {
            result = await context.runCli(`playbook unstage ${commandPath}`, {
              cwd,
            });
          });

          it('succeeds', () => {
            expect(result.returnCode).toEqual(0);
          });

          it('does appear as unchanged in the status', async () => {
            const result = await context.runCli('playbook status', { cwd });

            expect(result.stdout).toMatchOutput([
              'Changes not tracked:',
              `Command "${command.name}" ${commandPath}`,
            ]);
          });
        });

        describe('when submitting the changes', () => {
          beforeEach(async () => {
            await context.runCli(`playbook submit -m "Some change"`, { cwd });
          });

          it('creates a proposal with the correct targetId', async () => {
            const { changeProposals } =
              await context.gateway.changeProposals.listChangeProposalsByRecipe(
                {
                  artefactId: command.id,
                  spaceId: context.space.id,
                },
              );

            expect(changeProposals).toEqual([
              expect.objectContaining({
                artefactId: command.id,
                targetId: frontendTarget.id,
              }),
            ]);
          });
        });
      });
    });

    describe('when running commands inside another folder', () => {
      let commandPath: string;
      let cwd: string;

      beforeEach(async () => {
        fs.mkdirSync(`${context.testDir}/packages/whatever`, {
          recursive: true,
        });
        cwd = `${context.testDir}/packages/whatever`;
        commandPath = `../../apps/frontend/.packmind/commands/${command.slug}.md`;

        await context.runCli(`playbook add ${commandPath}`, { cwd });
      });

      it('shows the correct path in the status', async () => {
        const result = await context.runCli('playbook status', { cwd });

        expect(result.stdout).toMatchOutput(
          `Command "${command.name}" (updated) in space "Global" ${commandPath}`,
        );
      });
    });
  });
});
