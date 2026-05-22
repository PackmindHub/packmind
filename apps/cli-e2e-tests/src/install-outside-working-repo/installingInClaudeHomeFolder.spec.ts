import path from 'path';
import {
  createDirectory,
  describeForVersion,
  describeWithUserSignedUp,
  fileExists,
  readFile,
  updateFile,
  UserSignedUpContext,
} from '../helpers';
import { Package, Recipe, Skill, Standard } from '@packmind/types';

describe('Running packmind-install in ~/.claude', () => {
  describeForVersion(
    '> 0.29.0',
    'Running packmind-install in ~/.claude',
    () => {
      describeWithUserSignedUp('...', (getContext) => {
        let context: UserSignedUpContext;

        let pkg: Package;
        let standard: Standard;
        let command: Recipe;
        let skill: Skill;

        beforeEach(async () => {
          context = await getContext();

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
              cwd: path.join(context.testHome, '.claude'),
            });
          });

          it('installs the package without asking rendering mode', () => {
            const packmindJson = JSON.parse(
              readFile('.claude/packmind.json', context.testHome),
            );
            expect(packmindJson).toMatchObject({
              packages: {
                [`@${context.space.slug}/${pkg.slug}`]: '*',
              },
              agents: ['claude'],
            });
          });

          it('does not render the packmind folder', async () => {
            expect(
              fileExists(path.join('.claude', '.packmind'), context.testHome),
            ).toEqual(false);
          });

          it('creates the standard is ~/.claude/rules', () => {
            expect(
              fileExists(
                path.join(
                  '.claude',
                  'rules',
                  'packmind',
                  `standard-${standard.slug}.md`,
                ),
                context.testHome,
              ),
            ).toEqual(true);
          });

          it('strips references to the full standard which does not exist', async () => {
            const standardContent = readFile(
              path.join(
                '.claude',
                'rules',
                'packmind',
                `standard-${standard.slug}.md`,
              ),
              context.testHome,
            );

            expect(standardContent).not.toContain(
              'Full standard is available here for further request',
            );
          });

          it('creates the commands is ~/.claude/command', () => {
            expect(
              fileExists(
                path.join('.claude', 'commands', `${command.slug}.md`),
                context.testHome,
              ),
            ).toEqual(true);
          });
        });

        describe('when there is a packmind.json file available', () => {
          beforeEach(async () => {
            updateFile(
              path.join('.claude', 'packmind.json'),
              JSON.stringify({
                packages: {
                  [`@${context.space.slug}/${pkg.slug}`]: '*',
                },
              }),
              context.testHome,
            );

            await context.runCli(`install ${pkg.slug}`, {
              cwd: path.join(context.testHome, '.claude'),
            });
          });

          it('does not render the packmind folder', async () => {
            expect(
              fileExists(path.join('.claude', '.packmind'), context.testHome),
            ).toEqual(false);
          });

          it('creates the standard is ~/.claude/rules', () => {
            expect(
              fileExists(
                path.join(
                  '.claude',
                  'rules',
                  'packmind',
                  `standard-${standard.slug}.md`,
                ),
                context.testHome,
              ),
            ).toEqual(true);
          });

          it('strips references to the full standard which does not exist', async () => {
            const standardContent = readFile(
              path.join(
                '.claude',
                'rules',
                'packmind',
                `standard-${standard.slug}.md`,
              ),
              context.testHome,
            );

            expect(standardContent).not.toContain(
              'Full standard is available here for further request',
            );
          });

          it('creates the commands is ~/.claude/command', () => {
            expect(
              fileExists(
                path.join('.claude', 'commands', `${command.slug}.md`),
                context.testHome,
              ),
            ).toEqual(true);
          });
        });
      });
    },
  );
});
