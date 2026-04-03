import {
  describeWithUserSignedUp,
  describeForVersion,
  setupGitRepo,
  RunCliResult,
  UserSignedUpContext,
} from './helpers';

describeForVersion('>= 0.24.0', 'skills init command', () => {
  describeWithUserSignedUp('skills init command', (getContext) => {
    let context: UserSignedUpContext;
    let result: RunCliResult;

    beforeEach(async () => {
      context = await getContext();
      await setupGitRepo(context.testDir);

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
});
