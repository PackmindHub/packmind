import path from 'path';
import {
  createDirectory,
  describeForVersion,
  describeWithUserSignedUp,
  fileExists,
  readFile,
  RunCliResult,
  updateFile,
  UserSignedUpContext,
} from '../helpers';
import { Package, Recipe, Standard } from '@packmind/types';

describe('Running packmind-install in ~/.claude', () => {
  describeForVersion(
    '> 0.29.0',
    'Running packmind-install in ~/.claude',
    () => {
      describeWithUserSignedUp('...', (getContext) => {
        let context: UserSignedUpContext;
        let claudeHome: string;

        let pkg: Package;
        let standard: Standard;
        let command: Recipe;

        beforeEach(async () => {
          context = await getContext();
          claudeHome = path.join(context.testHome, '.claude');

          const createStandardResponse = await context.gateway.standards.create(
            {
              name: 'My standard',
              description: '',
              rules: [],
              scope: '',
              spaceId: context.space.id,
            },
          );
          standard = createStandardResponse.standard;
          command = await context.gateway.commands.create({
            name: 'My command',
            spaceId: context.space.id,
            content: 'Initial command body',
          });
          /*skill = await context.gateway.skills.create({
          name: 'My skill',
          description: '',
          prompt: '',
          spaceId: context.space.id,
        });*/

          const createPackageResponse = await context.gateway.packages.create({
            name: 'My package',
            description: '',
            spaceId: context.space.id,
            standardIds: [standard.id],
            recipeIds: [command.id],
            //skillIds: [skill.id],
          });
          pkg = createPackageResponse.package;

          createDirectory(context.testHome, '.claude');
        });

        describe('when there is no packmind.json available', () => {
          beforeEach(async () => {
            await context.runCli(`install ${pkg.slug}`, {
              cwd: claudeHome,
            });
          });

          it('installs the package without asking rendering mode', () => {
            const packmindJson = JSON.parse(
              readFile('packmind.json', claudeHome),
            );
            expect(packmindJson).toMatchObject({
              packages: {
                [`@${context.space.slug}/${pkg.slug}`]: '*',
              },
              agents: ['claude'],
            });
          });

          it('does not render the packmind folder', async () => {
            expect(fileExists('.packmind', claudeHome)).toEqual(false);
          });

          it('creates the standard is ~/.claude/rules', () => {
            expect(
              fileExists(
                path.join('rules', 'packmind', `standard-${standard.slug}.md`),
                claudeHome,
              ),
            ).toEqual(true);
          });

          it('strips references to the full standard which does not exist', async () => {
            const standardContent = readFile(
              path.join('rules', 'packmind', `standard-${standard.slug}.md`),
              claudeHome,
            );

            expect(standardContent).not.toContain(
              'Full standard is available here for further request',
            );
          });

          it('creates the commands is ~/.claude/command', () => {
            expect(
              fileExists(
                path.join('commands', `${command.slug}.md`),
                claudeHome,
              ),
            ).toEqual(true);
          });
        });

        describe('when there is a packmind.json file available', () => {
          beforeEach(async () => {
            updateFile(
              'packmind.json',
              JSON.stringify({
                packages: {
                  [`@${context.space.slug}/${pkg.slug}`]: '*',
                },
              }),
              claudeHome,
            );

            await context.runCli(`install ${pkg.slug}`, {
              cwd: claudeHome,
            });
          });

          it('does not render the packmind folder', async () => {
            expect(fileExists('.packmind', claudeHome)).toEqual(false);
          });

          it('creates the standard is ~/.claude/rules', () => {
            expect(
              fileExists(
                path.join('rules', 'packmind', `standard-${standard.slug}.md`),
                claudeHome,
              ),
            ).toEqual(true);
          });

          it('strips references to the full standard which does not exist', async () => {
            const standardContent = readFile(
              path.join('rules', 'packmind', `standard-${standard.slug}.md`),
              claudeHome,
            );

            expect(standardContent).not.toContain(
              'Full standard is available here for further request',
            );
          });

          it('creates the commands in ~/.claude/command', () => {
            expect(
              fileExists(
                path.join('commands', `${command.slug}.md`),
                claudeHome,
              ),
            ).toEqual(true);
          });
        });

        describe('playbook changes are properly handled', () => {
          let commandRelPath: string;
          let commandDiskPath: string;

          beforeEach(async () => {
            await context.runCli(`install ${pkg.slug}`, {
              cwd: claudeHome,
            });

            commandRelPath = path.join('commands', `${command.slug}.md`);
            commandDiskPath = path.join('.claude', commandRelPath);
            const commandContent = readFile(commandDiskPath, context.testHome);

            updateFile(
              commandDiskPath,
              `${commandContent}\nSome new line at the end`,
              context.testHome,
            );
          });

          it('detects the local modification', async () => {
            const { stdout } = await context.runCli('playbook status', {
              cwd: claudeHome,
            });
            expect(stdout).toMatchOutput([
              `Command "${command.name}" ${commandRelPath}`,
            ]);
          });

          describe('when user stages the change', () => {
            let runAddResult: RunCliResult;

            beforeEach(async () => {
              runAddResult = await context.runCli(
                `playbook add ${commandRelPath}`,
                { cwd: claudeHome },
              );
            });

            it('stages the command as an update', () => {
              expect(runAddResult.stdout).toMatchOutput(
                `Staged "${command.name}" (command, updated) to playbook in space "${context.space.name}"`,
              );
            });

            describe('when user submits the change', () => {
              let runSubmitResult: RunCliResult;

              beforeEach(async () => {
                runSubmitResult = await context.runCli(
                  `playbook submit --no-review`,
                  { cwd: claudeHome },
                );
              });

              it('applies the change directly', () => {
                expect(runSubmitResult.stdout).toMatchOutput(
                  `1 command updated`,
                );
              });
            });
          });
        });
      });
    },
  );
});
