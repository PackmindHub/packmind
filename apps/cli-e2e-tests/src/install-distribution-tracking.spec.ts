import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import {
  describeForVersion,
  describeWithUserSignedUp,
  RunCliResult,
  setupGitRepo,
  UserSignedUpContext,
} from './helpers';
import { Distribution, Package } from '@packmind/types';
import { matchesVersionConstraint } from './helpers/cliVersion';

const packmindEmail = (): string =>
  `install-tracking-e2e-${uuidv4()}@packmind.com`;

async function seedPackage(context: UserSignedUpContext): Promise<Package> {
  const unique = uuidv4();

  const recipe = await context.gateway.commands.create({
    name: `Install tracking recipe ${unique}`,
    summary: 'A recipe used by the install distribution-tracking e2e suite',
    spaceId: context.space.id,
    steps: [{ name: 'Step one', description: 'Do the thing' }],
  });

  const packageResponse = await context.gateway.packages.create({
    name: `Install tracking package ${unique}`,
    description:
      'A package used by the install distribution-tracking e2e suite',
    recipeIds: [recipe.id],
    standardIds: [],
    spaceId: context.space.id,
  });

  return packageResponse.package;
}

describe('track/untrack', () => {
  describeForVersion('> 0.31.0', 'install distribution recording', () => {
    let trackCommand: string;

    describeWithUserSignedUp(
      'when installing on the tracked repository and branch',
      (getContext) => {
        let context: UserSignedUpContext;
        let pkg: Package;
        let result: RunCliResult;
        let distributions: Distribution[];

        beforeEach(async () => {
          context = await getContext();
          trackCommand = matchesVersionConstraint('>0.33.0')
            ? 'git track'
            : 'track';

          await setupGitRepo(context.testDir);
          pkg = await seedPackage(context);
          await context.runCli(trackCommand);
          result = await context.runCli(
            `install @${context.space.slug}/${pkg.slug}`,
          );
          distributions =
            await context.gateway.deployments.listDeploymentsByPackage(pkg.id);

          console.log('---------------------------');
          console.log(matchesVersionConstraint('> 0.33.0'), trackCommand);
        });

        it.only('exits successfully', () => {
          expect(result.returnCode).toBe(0);
        });

        it('records a distribution for the package', () => {
          expect(distributions.length).toBeGreaterThan(0);
        });
      },
      { email: packmindEmail },
    );

    describeWithUserSignedUp(
      'when installing on an untracked repository',
      (getContext) => {
        let context: UserSignedUpContext;
        let pkg: Package;
        let result: RunCliResult;
        let distributions: Distribution[];

        beforeEach(async () => {
          context = await getContext();
          await setupGitRepo(context.testDir);
          pkg = await seedPackage(context);
          result = await context.runCli(
            `install @${context.space.slug}/${pkg.slug}`,
          );
          distributions =
            await context.gateway.deployments.listDeploymentsByPackage(pkg.id);
        });

        it('exits successfully', () => {
          expect(result.returnCode).toBe(0);
        });

        it('does not record any distribution', () => {
          expect(distributions).toEqual([]);
        });

        it('warns that the repository is not tracked', () => {
          expect(result.stderr).toContain('not tracked');
        });
      },
      { email: packmindEmail },
    );

    describeWithUserSignedUp(
      'when installing on a branch other than the tracked branch',
      (getContext) => {
        let context: UserSignedUpContext;
        let pkg: Package;
        let result: RunCliResult;
        let distributions: Distribution[];

        beforeEach(async () => {
          context = await getContext();
          await setupGitRepo(context.testDir);
          pkg = await seedPackage(context);
          await context.runCli(trackCommand);
          execSync('git checkout -b dev', { cwd: context.testDir });
          result = await context.runCli(
            `install @${context.space.slug}/${pkg.slug}`,
          );
          distributions =
            await context.gateway.deployments.listDeploymentsByPackage(pkg.id);
        });

        it('exits successfully', () => {
          expect(result.returnCode).toBe(0);
        });

        it('does not record any distribution', () => {
          expect(distributions).toEqual([]);
        });

        it('warns naming the tracked branch', () => {
          expect(result.stderr).toContain("tracked branch is 'main'");
        });
      },
      { email: packmindEmail },
    );

    // Gated above the current release: this scenario needs `untrack`,
    // which the released binary does not have.
    describeForVersion(
      '> 0.32.0',
      'install distribution recording after tracking removal',
      () => {
        let trackCommand: string;
        let untrackCommand: string;

        // A repository whose tracking was removed must behave exactly like one that
        // was never tracked: the install completes locally and records nothing.
        describeWithUserSignedUp(
          'when installing after tracking was removed',
          (getContext) => {
            let context: UserSignedUpContext;
            let pkg: Package;
            let result: RunCliResult;
            let distributions: Distribution[];

            beforeEach(async () => {
              context = await getContext();
              trackCommand = matchesVersionConstraint('>0.33.0')
                ? 'git track'
                : 'track';
              untrackCommand = matchesVersionConstraint('>0.33.0')
                ? 'git untrack'
                : 'untrack';
              await setupGitRepo(context.testDir);
              pkg = await seedPackage(context);
              await context.runCli(trackCommand);
              await context.runCli(untrackCommand);
              result = await context.runCli(
                `install @${context.space.slug}/${pkg.slug}`,
              );
              distributions =
                await context.gateway.deployments.listDeploymentsByPackage(
                  pkg.id,
                );

              console.log('---------------------------');
              console.log(
                matchesVersionConstraint('> 0.33.0'),
                trackCommand,
                untrackCommand,
              );
            });

            it('exits successfully', () => {
              expect(result.returnCode).toBe(0);
            });

            it('does not record any distribution', () => {
              expect(distributions).toEqual([]);
            });

            it('warns that the repository is not tracked', () => {
              expect(result.stderr).toContain('not tracked');
            });
          },
          { email: packmindEmail },
        );
      },
    );
  });
});
