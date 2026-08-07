import {
  describeForVersion,
  describeWithUserSignedUp,
  runCli,
  UserSignedUpContext,
} from './helpers';
import { describeWithTempSpace } from './helpers/describeWithTempSpace';

describeForVersion('> 0.31.0', 'git command', () => {
  describeWithTempSpace('when the user is not signed in', (getContext) => {
    let result: Awaited<ReturnType<typeof runCli>>;

    beforeEach(async () => {
      const { testDir } = await getContext();
      result = await runCli('git connection list', { cwd: testDir });
    });

    it('exits with code 1', () => {
      expect(result.returnCode).toBe(1);
    });
  });

  describeWithUserSignedUp('when no connection exists', (getContext) => {
    let result: Awaited<ReturnType<typeof runCli>>;

    beforeEach(async () => {
      const context = await getContext();
      result = await context.runCli('git connection list');
    });

    it('exits with code 0', () => {
      expect(result.returnCode).toBe(0);
    });

    it('reports that no connections were found', () => {
      expect(result.stdout).toContain('No git connections found.');
    });
  });

  describeWithUserSignedUp('when adding a git connection', (getContext) => {
    let context: UserSignedUpContext;
    let result: Awaited<ReturnType<typeof runCli>>;

    beforeEach(async () => {
      context = await getContext();
      result = await context.runCli(
        "git connection add e2e-test-token --displayName='E2E GitLab' --type=gitlab --url=https://gitlab.example.com",
      );
    });

    it('exits with code 0', () => {
      expect(result.returnCode).toBe(0);
    });

    it('confirms the connection was created', () => {
      expect(result.stdout).toContain('Git connection created');
    });

    describe('then listing connections', () => {
      let listResult: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        listResult = await context.runCli('git connection list');
      });

      it('shows the new connection', () => {
        expect(listResult.stdout).toContain('E2E GitLab');
      });
    });

    describe('then managing a repository', () => {
      let connectionId: string;
      let addRepoResult: Awaited<ReturnType<typeof runCli>>;

      beforeEach(async () => {
        const { providers } = await context.gateway.git.listProviders({});
        connectionId = providers[0].id;
        addRepoResult = await context.runCli(
          `git repo add myOrga/myRepo --connectionId=${connectionId} --branch=main`,
        );
      });

      it('exits with code 0', () => {
        expect(addRepoResult.returnCode).toBe(0);
      });

      it('confirms the repository was added', () => {
        expect(addRepoResult.stdout).toContain('Repository added');
      });

      describe('then listing managed repositories', () => {
        let repoListResult: Awaited<ReturnType<typeof runCli>>;

        beforeEach(async () => {
          repoListResult = await context.runCli(
            `git repo list --connectionId=${connectionId}`,
          );
        });

        it('lists the managed repository', () => {
          expect(repoListResult.stdout).toContain('myOrga/myRepo');
        });
      });
    });
  });
});
