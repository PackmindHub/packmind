import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import {
  describeForVersion,
  describeWithExtraUser,
  describeWithUserSignedUp,
  runCli,
  setupGitRepo,
  WithMemberContext,
} from './helpers';

const randomEmail = (): string => `git-info-e2e-${uuidv4()}@example.com`;

// `git info` ships after 0.33.0, together with the `git` command that hosts it:
// the released binary has no such command and cmd-ts rejects the invocation.
describeForVersion('> 0.33.0', 'git info', () => {
  describeWithUserSignedUp(
    'when the repository is not tracked',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        result = await context.runCli('git info');
      });

      // Reporting the state is the whole job, so "not tracked" is an answer
      // rather than a failure.
      it('exits successfully', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the repository is not tracked', () => {
        expect(result.stdout).toContain(
          'PackmindHub/sample-repo is not tracked in Packmind',
        );
      });

      it('proposes tracking the checked-out branch', () => {
        expect(result.stdout).toContain(
          "packmind git track to track branch 'main'",
        );
      });
    },
    { email: randomEmail },
  );

  describeWithUserSignedUp(
    'when the checked-out branch is the tracked one',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli('git track');
        result = await context.runCli('git info');
      });

      it('exits successfully', () => {
        expect(result.returnCode).toBe(0);
      });

      it('names the tracked repository and branch', () => {
        expect(result.stdout).toContain(
          "Packmind tracks PackmindHub/sample-repo on branch 'main'.",
        );
      });

      it('does not warn about unrecorded distributions', () => {
        expect(result.stdout).not.toContain('are not recorded');
      });
    },
    { email: randomEmail },
  );

  describeWithUserSignedUp(
    'when another branch is checked out',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli('git track');
        execSync('git checkout -b dev', { cwd: context.testDir });
        result = await context.runCli('git info');
      });

      it('exits successfully', () => {
        expect(result.returnCode).toBe(0);
      });

      it('still names the tracked branch', () => {
        expect(result.stdout).toContain(
          "Packmind tracks PackmindHub/sample-repo on branch 'main'.",
        );
      });

      // Silently reporting "tracked" would hide that nothing installed from
      // here reaches Packmind.
      it('warns that distributions from here are not recorded', () => {
        expect(result.stdout + result.stderr).toContain(
          "You are on 'dev', so distributions from here are not recorded",
        );
      });

      it('points at the command that moves tracking', () => {
        expect(result.stdout + result.stderr).toContain(
          'packmind git track --update',
        );
      });
    },
    { email: randomEmail },
  );

  describeWithUserSignedUp(
    'when run outside a git repository',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context = await getContext();
        result = await context.runCli('git info');
      });

      it('exits with an error', () => {
        expect(result.returnCode).toBe(1);
      });

      it('explains the path is not inside a git repository', () => {
        expect(result.stdout + result.stderr).toContain(
          'does not appear to be inside a Git repository',
        );
      });

      it('does not blame a command that was not run', () => {
        expect(result.stdout + result.stderr).not.toContain('lint');
      });

      it('does not leak the raw git output', () => {
        expect(result.stdout + result.stderr).not.toContain('fatal:');
      });
    },
    { email: randomEmail },
  );

  // Setting the tracked branch is admin-only, but reading it is not.
  describeWithExtraUser(
    'when a non-admin member asks for the tracking state',
    (getContext) => {
      let result: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const context: WithMemberContext = await getContext();
        await setupGitRepo(context.testDir);
        await context.runCli('git track');
        result = await runCli('git info', {
          apiKey: context.extraUserApiKey,
          cwd: context.testDir,
        });
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the tracked branch', () => {
        expect(result.stdout).toContain(
          "Packmind tracks PackmindHub/sample-repo on branch 'main'.",
        );
      });
    },
    // No fixed email: the fixture re-runs per test, and re-inviting the same
    // address fails. Omitting it gets a fresh member each time.
    { role: 'member' },
  );
});
