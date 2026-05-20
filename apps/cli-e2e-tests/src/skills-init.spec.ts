import {
  describeWithUserSignedUp,
  describeForVersion,
  setupGitRepo,
  RunCliResult,
  UserSignedUpContext,
  updateFile,
} from './helpers';

describeForVersion('>= 0.24.0', 'skills init command', () => {
  describeWithUserSignedUp('skills init command', (getContext) => {
    describe('when configured agents include a skill-capable agent', () => {
      let context: UserSignedUpContext;
      let result: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        await setupGitRepo(context.testDir);
        updateFile(
          'packmind.json',
          JSON.stringify({ packages: {}, agents: ['claude'] }),
          context.testDir,
        );

        result = await context.runCli('skills init');
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('displays a success message', () => {
        expect(result.stdout).toMatch(
          /Default skills installed successfully|Default skills are already up to date/,
        );
      });

      it('does not output any error', () => {
        expect(result.stdout).not.toContain('Installation failed');
      });
    });

    describeForVersion(
      '> 0.28.1',
      'when no configured agent supports skills',
      () => {
        let context: UserSignedUpContext;
        let result: RunCliResult;

        beforeEach(async () => {
          context = await getContext();
          await setupGitRepo(context.testDir);
          updateFile(
            'packmind.json',
            JSON.stringify({ packages: {}, agents: ['agents_md'] }),
            context.testDir,
          );

          result = await context.runCli('skills init');
        });

        it('succeeds', () => {
          expect(result.returnCode).toBe(0);
        });

        it('warns that skills are skipped', () => {
          expect(result.stderr).toMatch(
            /Skipping default skills.*do not support skills/,
          );
        });

        it('does not display the misleading "already up to date" message', () => {
          expect(result.stdout).not.toContain(
            'Default skills are already up to date',
          );
        });
      },
    );
  });
});
