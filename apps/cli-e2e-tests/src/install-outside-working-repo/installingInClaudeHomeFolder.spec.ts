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
import { Package, Recipe, Skill, Standard } from '@packmind/types';

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
        let skill: Skill;

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

          const uploadSkillResponse = await context.gateway.skills.upload({
            spaceId: context.space.id,
            files: [
              {
                path: 'SKILL.md',
                content: `
---
name: my-skill
description: A skill to do things and stuff
---

Say "Hello world"
`,
                permissions: '0755',
                isBase64: false,
              },
            ],
          });
          skill = uploadSkillResponse.skill;

          const createPackageResponse = await context.gateway.packages.create({
            name: 'My package',
            description: '',
            spaceId: context.space.id,
            standardIds: [standard.id],
            recipeIds: [command.id],
            skillIds: [skill.id],
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

          it('creates the standard in ~/.claude/rules', () => {
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

          it('creates the skill in ~/.claude/skills', () => {
            expect(
              fileExists(
                path.join('skills', skill.slug, `SKILL.md`),
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
          // Each artefact type needs a structurally meaningful edit so the
          // playbook can detect a diff. For standards, the parser only sees
          // bullet lines under the rules section — appending a non-bullet line
          // would be silently dropped during comparison.
          const artefactTestData: {
            type: string;
            testData: () => {
              filePath: string;
              appendedContent: string;
              expectedStatusOutput: string;
              expectedStageOutput: string;
              expectedSubmitOutput: string;
            };
          }[] = [
            {
              type: 'command',
              testData: () => ({
                filePath: path.join('commands', `${command.slug}.md`),
                appendedContent: '\nSome new line at the end',
                expectedStatusOutput: `Command "${command.name}" ${path.join('commands', `${command.slug}.md`)}`,
                expectedStageOutput: `Staged "${command.name}" (command, updated) to playbook in space "${context.space.name}"`,
                expectedSubmitOutput: `1 command updated`,
              }),
            },
            {
              type: 'standard',
              testData: () => ({
                filePath: path.join(
                  'rules',
                  'packmind',
                  `standard-${standard.slug}.md`,
                ),
                appendedContent: '\n* A new rule added by the test',
                expectedStatusOutput: `Standard "${standard.name}" ${path.join('rules', 'packmind', `standard-${standard.slug}.md`)}`,
                expectedStageOutput: `Staged "${standard.name}" (standard, updated) to playbook in space "${context.space.name}"`,
                expectedSubmitOutput: `1 standard updated`,
              }),
            },
            {
              type: 'skill',
              testData: () => ({
                filePath: path.join('skills', skill.slug, 'SKILL.md'),
                appendedContent: '\nSome new line at the end',
                expectedStatusOutput: `Skill "${skill.name}" ${path.join('skills', skill.slug, 'SKILL.md')}`,
                expectedStageOutput: `Staged "${skill.name}" (skill, updated) to playbook in space "${context.space.name}"`,
                expectedSubmitOutput: `1 skill updated`,
              }),
            },
          ];

          beforeEach(async () => {
            await context.runCli(`install ${pkg.slug}`, {
              cwd: claudeHome,
            });
          });

          for (const { type, testData } of artefactTestData) {
            describe(`Handling ${type} updates`, () => {
              let artefactDiskPath: string;

              let filePath: string;
              let expectedStatusOutput: string;
              let expectedStageOutput: string;
              let expectedSubmitOutput: string;

              beforeEach(async () => {
                const td = testData();
                filePath = td.filePath;
                expectedStatusOutput = td.expectedStatusOutput;
                expectedStageOutput = td.expectedStageOutput;
                expectedSubmitOutput = td.expectedSubmitOutput;

                artefactDiskPath = path.join('.claude', filePath);
                const artefactContent = readFile(
                  artefactDiskPath,
                  context.testHome,
                );

                updateFile(
                  artefactDiskPath,
                  `${artefactContent}${td.appendedContent}`,
                  context.testHome,
                );
              });

              it('detects the local modification', async () => {
                const { stdout } = await context.runCli('playbook status', {
                  cwd: claudeHome,
                });
                expect(stdout).toMatchOutput(expectedStatusOutput);
              });

              describe('when user stages the change', () => {
                let runAddResult: RunCliResult;

                beforeEach(async () => {
                  runAddResult = await context.runCli(
                    `playbook add ${filePath}`,
                    { cwd: claudeHome },
                  );
                });

                it('stages the command as an update', () => {
                  expect(runAddResult.stdout).toMatchOutput(
                    expectedStageOutput,
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
                      expectedSubmitOutput,
                    );
                  });
                });
              });
            });
          }
        });
      });
    },
  );
});
