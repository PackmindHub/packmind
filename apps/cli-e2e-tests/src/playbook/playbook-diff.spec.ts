import {
  describeWithUserSignedUp,
  readFile,
  runCli,
  setupGitRepo,
  updateFile,
} from '../helpers';
import { Package, Recipe } from '@packmind/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { recipeFactory } from '@packmind/recipes/test';

describe('whatever', () => {
  describeWithUserSignedUp('playbook status command', (getContext) => {
    let apiKey: string;
    let testDir: string;
    let sharedHome: string;

    let command: Recipe;
    let pkg: Package;

    beforeEach(async () => {
      const context = await getContext();
      await setupGitRepo(context.testDir);

      apiKey = context.apiKey;
      testDir = context.testDir;
      sharedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-home-'));

      command = await context.gateway.commands.create(
        recipeFactory({
          spaceId: context.space.id,
        }),
      );
      const createPackage = await context.gateway.packages.create({
        description: '',
        name: 'My package',
        recipeIds: [command.id],
        spaceId: context.space.id,
        standardIds: [],
      });
      pkg = createPackage.package;

      await runCli(`install ${pkg.slug}`, { apiKey, cwd: testDir });
    });

    afterEach(() => {
      if (sharedHome && fs.existsSync(sharedHome)) {
        fs.rmSync(sharedHome, { recursive: true, force: true });
      }
    });

    describe('when there are not changes', () => {
      it('shows "No changes found."', async () => {
        const result = await runCli('diff', { apiKey, cwd: testDir });

        expect(result.stdout).toContain('No changes found.');
      });
    });

    describe('when a file has been changed', () => {
      let commandPath: string;

      beforeEach(async () => {
        commandPath = `.packmind/commands/${command.slug}.md`;

        const originalContent = readFile(commandPath, testDir);
        updateFile(commandPath, `${originalContent}\n* Never use var`, testDir);
      });

      it('shows the changes for the modified file', async () => {
        const result = await runCli('diff', { apiKey, cwd: testDir });

        expect(result.stderr.split('\n')).toEqual([
          expect.stringContaining('Summary: 1 change found on 1 artefact:'),
          expect.stringContaining(`* Command "${command.name}"`),
          '',
        ]);
      });

      describe('when changes have been submitted', () => {
        beforeEach(async () => {
          await runCli(`playbook status`, {
            apiKey,
            cwd: testDir,
            home: sharedHome,
          });
          await runCli(`playbook add ${commandPath}`, {
            apiKey,
            cwd: testDir,
            home: sharedHome,
          });
          await runCli('playbook submit -m "Update command"', {
            apiKey,
            cwd: testDir,
            home: sharedHome,
          });
        });

        it('shows "No new changes found."', async () => {
          const result = await runCli('diff', { apiKey, cwd: testDir });

          expect(result.stdout).toContain('No new changes found.');
        });

        describe('when using --include-submitted', () => {
          it('shows the previously sent change', async () => {
            const result = await runCli('diff --include-submitted', {
              apiKey,
              cwd: testDir,
            });

            expect(result.stdout.split('\n')).toEqual(
              expect.arrayContaining([
                expect.stringContaining(`Command "${command.name}"`),
                expect.stringContaining(commandPath),
                expect.stringContaining('already submitted on'),
              ]),
            );
          });
        });
      });
    });
  });
});
