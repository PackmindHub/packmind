import {
  describeWithUserSignedUp,
  readFile,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from '../helpers';
import { Package, Recipe } from '@packmind/types';
import { recipeFactory } from '@packmind/recipes/test';

describeWithUserSignedUp('playbook status command', (getContext) => {
  let context: UserSignedUpContext;

  let command: Recipe;
  let pkg: Package;

  beforeEach(async () => {
    context = await getContext();
    await setupGitRepo(context.testDir);

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

    await context.runCli(`install ${pkg.slug}`);
  });

  describe('when there are not changes', () => {
    it('shows "No changes found."', async () => {
      const result = await context.runCli('diff');

      expect(result.stdout).toContain('No changes found.');
    });
  });

  describe('when a file has been changed', () => {
    let commandPath: string;

    beforeEach(async () => {
      commandPath = `.packmind/commands/${command.slug}.md`;

      const originalContent = readFile(commandPath, context.testDir);
      updateFile(
        commandPath,
        `${originalContent}\n* Never use var`,
        context.testDir,
      );
    });

    it('shows the changes for the modified file', async () => {
      const result = await context.runCli('diff');

      expect(result.stderr.split('\n')).toEqual([
        expect.stringContaining('Summary: 1 change found on 1 artefact:'),
        expect.stringContaining(`* Command "${command.name}"`),
        '',
      ]);
    });

    describe('when changes have been submitted', () => {
      beforeEach(async () => {
        await context.runCli(`playbook status`);
        await context.runCli(`playbook add ${commandPath}`);
        await context.runCli('playbook submit -m "Update command"');
      });

      it('shows "No new changes found."', async () => {
        const result = await context.runCli('diff');

        expect(result.stdout).toContain('No new changes found.');
      });

      describe('when using --include-submitted', () => {
        it('shows the previously sent change', async () => {
          const result = await context.runCli('diff --include-submitted');

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
