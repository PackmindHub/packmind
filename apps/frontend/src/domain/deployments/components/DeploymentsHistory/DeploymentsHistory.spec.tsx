import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import { DeploymentsHistoryDataTestId } from '@packmind/frontend';
import {
  createCommandId,
  createCommandVersionId,
  createDistributedPackageId,
  createDistributionId,
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  PackageId,
  TargetId,
  createSkillId,
  createSkillVersionId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  DistributionStatus,
  RenderMode,
  type CommandDistributionHistoryEntry,
  type DistributedPackageHistoryEntry,
  type DistributionHistoryEntry,
  type DistributionOperation,
  type SkillDistributionHistoryEntry,
  type StandardDistributionHistoryEntry,
} from '@packmind/types';

import { DeploymentsHistory } from './DeploymentsHistory';

const packageId = createPackageId('package-1');
const authorId = createUserId('user-1');
const LONG_ERROR =
  'Repository jracenet/sandbox-services is archived and cannot be written to';

const distribution = (
  index: number,
  overrides: Partial<DistributionHistoryEntry> = {},
  operation: DistributionOperation = 'add',
  versionSpec: string | null = null,
  latestReleaseVersion: string | null = null,
): DistributionHistoryEntry => ({
  id: createDistributionId(`distribution-${index}`),
  createdAt: '2026-08-31T10:56:00.000Z',
  authorId,
  organizationId: createOrganizationId('org-1'),
  status: DistributionStatus.success,
  renderModes: [RenderMode.AGENTS_MD],
  source: 'app',
  target: {
    id: createTargetId(`target-${index}`),
    name: 'default',
    path: 'packages/cli/',
    gitRepoId: createGitRepoId('repo-1'),
    gitRepo: {
      id: createGitRepoId('repo-1'),
      owner: 'PackmindHub',
      repo: 'packmind-proprietary',
      branch: 'main',
      providerId: createGitProviderId('provider-1'),
      type: 'standard',
      isTracked: true,
      trackingRemovedAt: null,
    },
  },
  distributedPackages: [
    {
      id: createDistributedPackageId(`distributed-${index}`),
      distributionId: createDistributionId(`distribution-${index}`),
      packageId,
      operation,
      versionSpec,
      latestReleaseVersion,
    },
  ],
  ...overrides,
});

const renderHistory = (deployments: DistributionHistoryEntry[]) =>
  render(
    <MemoryRouter>
      <UIProvider>
        <DeploymentsHistory
          deployments={deployments}
          type="package"
          entityId={packageId}
          usersMap={{ [authorId]: 'joan.racenet' }}
        />
      </UIProvider>
    </MemoryRouter>,
  );

/*
 * The three artifact histories, where the version column and the Removed badge
 * are read off the one distributed package that carries the artifact. Each
 * listing loads only its own version collection, so a fixture that carried the
 * other two would not be the shape the component is given.
 */
const commandId = createCommandId('command-1');
const standardId = createStandardId('standard-1');
const skillId = createSkillId('skill-1');

const artifactDistribution = <DP extends DistributedPackageHistoryEntry>(
  distributedPackages: DP[],
) => ({
  ...distribution(1),
  distributedPackages,
});

const distributedPackage = (
  index: number,
  operation: DistributionOperation = 'add',
  versionSpec: string | null = null,
) => ({
  id: createDistributedPackageId(`distributed-${index}`),
  distributionId: createDistributionId('distribution-1'),
  packageId,
  operation,
  versionSpec,
  latestReleaseVersion: null,
});

const withCommandVersion = (
  index: number,
  version: number,
  recipeId = commandId,
  operation: DistributionOperation = 'add',
) => ({
  ...distributedPackage(index, operation),
  recipeVersions: [
    {
      id: createCommandVersionId(`command-version-${index}`),
      recipeId,
      name: 'Governed Command',
      slug: 'governed-command',
      content: '# Governed Command',
      version,
      userId: null,
    },
  ],
});

const withStandardVersion = (
  index: number,
  version: number,
  operation: DistributionOperation = 'add',
) => ({
  ...distributedPackage(index, operation),
  standardVersions: [
    {
      id: createStandardVersionId(`standard-version-${index}`),
      standardId,
      name: 'Governed Standard',
      slug: 'governed-standard',
      description: 'A governed standard',
      version,
      userId: null,
      scope: null,
    },
  ],
});

const withSkillVersion = (
  index: number,
  version: number,
  operation: DistributionOperation = 'add',
) => ({
  ...distributedPackage(index, operation),
  skillVersions: [
    {
      id: createSkillVersionId(`skill-version-${index}`),
      skillId,
      name: 'Governed Skill',
      slug: 'governed-skill',
      description: 'A governed skill',
      prompt: 'Do the governed thing',
      version,
      userId: createUserId('user-1'),
    },
  ],
});

const renderCommandHistory = (deployments: CommandDistributionHistoryEntry[]) =>
  render(
    <MemoryRouter>
      <UIProvider>
        <DeploymentsHistory
          deployments={deployments}
          type="command"
          entityId={commandId}
          usersMap={{ [authorId]: 'joan.racenet' }}
        />
      </UIProvider>
    </MemoryRouter>,
  );

const renderStandardHistory = (
  deployments: StandardDistributionHistoryEntry[],
) =>
  render(
    <MemoryRouter>
      <UIProvider>
        <DeploymentsHistory
          deployments={deployments}
          type="standard"
          entityId={standardId}
          usersMap={{ [authorId]: 'joan.racenet' }}
        />
      </UIProvider>
    </MemoryRouter>,
  );

const renderSkillHistory = (deployments: SkillDistributionHistoryEntry[]) =>
  render(
    <MemoryRouter>
      <UIProvider>
        <DeploymentsHistory
          deployments={deployments}
          type="skill"
          entityId={skillId}
          usersMap={{ [authorId]: 'joan.racenet' }}
        />
      </UIProvider>
    </MemoryRouter>,
  );

/**
 * jsdom lays nothing out, so the two numbers the message cell measures itself
 * with are always zero. These fix them for the length of one test.
 */
const stubLayout = (scrollWidth: number, clientWidth: number) => {
  for (const [prop, value] of [
    ['scrollWidth', scrollWidth],
    ['clientWidth', clientWidth],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get: () => value,
    });
  }
};

afterEach(() => {
  for (const prop of ['scrollWidth', 'clientWidth']) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      value: 0,
    });
  }
});

describe('DeploymentsHistory', () => {
  const headers = () =>
    screen.getAllByRole('columnheader').map((cell) => cell.textContent);

  /** The Version column, which leads every row. */
  const version = () => screen.getAllByRole('cell')[0];

  const packageVersions = () =>
    screen
      .getAllByTestId(DeploymentsHistoryDataTestId.PackageVersion)
      .map((cell) => cell.textContent);

  /*
   * Two columns printed the same value on nearly every row of the log, and
   * between them they held the width the error message needed to be read at
   * all.
   */
  describe('columns', () => {
    it('spends no column on the operation', () => {
      renderHistory([distribution(1)]);

      expect(headers()).not.toContain('Operation');
    });

    it('spends no column on the author', () => {
      renderHistory([distribution(1)]);

      expect(headers()).not.toContain('Author');
    });

    it('puts the version first', () => {
      renderHistory([distribution(1)]);

      expect(headers()[0]).toBe('Version');
    });

    it('keeps the message, which is the one that runs out of room', () => {
      renderHistory([distribution(1)]);

      expect(headers()).toContain('Message');
    });

    // A narrow table cut its pixel-wide columns' neighbours down to a letter.
    it('sizes every column as a share of the table', () => {
      const { container } = renderHistory([distribution(1)]);

      const widths = Array.from(container.querySelectorAll('col')).map((col) =>
        col.getAttribute('width'),
      );
      expect(widths.every((width) => width?.endsWith('%'))).toBe(true);
    });

    it('names a header in full when its column cuts it', async () => {
      stubLayout(400, 60);
      renderHistory([distribution(1)]);

      await userEvent.hover(screen.getByText('Distributed At'));

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Distributed At',
      );
    });
  });

  describe('when the repository of the target can no longer be found', () => {
    const base = distribution(1);
    const orphan = distribution(1, {
      target: {
        ...base.target,
        gitRepo: undefined,
      } as DistributionHistoryEntry['target'],
    });

    it('names the repository unknown', () => {
      renderHistory([orphan]);

      expect(screen.getByText('Unknown repository')).toBeInTheDocument();
    });

    it('does not print the repository id in the row', () => {
      renderHistory([orphan]);

      expect(screen.queryByText(/repo-1/)).not.toBeInTheDocument();
    });
  });

  describe('when a distribution took the package out of a target', () => {
    it('says so beside the place, having no column left to say it in', () => {
      renderHistory([distribution(1, {}, 'remove')]);

      expect(screen.getByText('Removed')).toBeInTheDocument();
    });
  });

  describe('when a distribution put the package in', () => {
    it('says nothing, which is what forty-three rows out of forty-four say', () => {
      renderHistory([distribution(1)]);

      expect(screen.queryByText('Removed')).not.toBeInTheDocument();
    });
  });

  /*
   * The author is worth keeping and was not worth a column: it goes under the
   * date, where the target cell already puts the branch under the repository.
   */
  describe('the author', () => {
    it('stays readable without a column of its own', () => {
      renderHistory([distribution(1)]);

      expect(screen.getByText('joan.racenet')).toBeInTheDocument();
    });
  });

  /*
   * What the e2e suite reads. It used to find these by counting cells, which
   * held until the columns around them changed: it then read the status badge
   * as the author and the destination as a repository glued to its branch, and
   * CliInstallDistribution failed on every push. The names are the contract
   * between this component and that suite, so they are asserted here, where a
   * rename is caught in seconds rather than in a browser.
   */
  describe('the parts the e2e suite reads by name', () => {
    it('names the repository a distribution landed in', () => {
      renderHistory([distribution(1)]);

      expect(
        screen.getByTestId(DeploymentsHistoryDataTestId.DestinationRepository),
      ).toHaveTextContent('PackmindHub/packmind-proprietary');
    });

    it('names the branch and path under it', () => {
      renderHistory([distribution(1)]);

      expect(
        screen.getByTestId(DeploymentsHistoryDataTestId.DestinationDetail),
      ).toHaveTextContent('main · packages/cli/');
    });

    it('names the badge saying how the distribution ended', () => {
      renderHistory([distribution(1)]);

      expect(
        screen.getByTestId(DeploymentsHistoryDataTestId.Status),
      ).toHaveTextContent('Success');
    });

    describe('when the distribution failed', () => {
      it('carries the name on that badge too', () => {
        renderHistory([
          distribution(1, { status: DistributionStatus.failure }),
        ]);

        expect(
          screen.getByTestId(DeploymentsHistoryDataTestId.Status),
        ).toHaveTextContent('Failed');
      });
    });
  });

  describe('when a failed distribution says why', () => {
    it('shows the reason rather than the status alone', () => {
      renderHistory([
        distribution(1, {
          status: DistributionStatus.failure,
          error: LONG_ERROR,
        }),
      ]);

      expect(screen.getByText(LONG_ERROR)).toBeInTheDocument();
    });
  });

  /*
   * The tooltip is worth having for the message that does not fit and only for
   * that one. An unconditional one repeats a sentence the reader can already
   * see, over the row underneath it, on every row of a forty-row log.
   */
  describe('when the message fits its column', () => {
    it('adds no tooltip repeating what is on screen', async () => {
      stubLayout(200, 400);
      renderHistory([
        distribution(1, {
          status: DistributionStatus.failure,
          error: LONG_ERROR,
        }),
      ]);

      await userEvent.hover(screen.getByText(LONG_ERROR));

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('when the message is cut by its column', () => {
    it('puts the rest under the pointer', async () => {
      stubLayout(400, 200);
      renderHistory([
        distribution(1, {
          status: DistributionStatus.failure,
          error: LONG_ERROR,
        }),
      ]);

      await userEvent.hover(screen.getByText(LONG_ERROR));

      expect(await screen.findByRole('tooltip')).toHaveTextContent(LONG_ERROR);
    });
  });
  describe('when a target was deleted since', () => {
    const renderWithLiveTargets = (liveTargetIds?: ReadonlySet<TargetId>) =>
      render(
        <MemoryRouter>
          <UIProvider>
            <DeploymentsHistory
              deployments={[distribution(1), distribution(2)]}
              type="package"
              entityId={packageId}
              usersMap={{ [authorId]: 'joan.racenet' }}
              liveTargetIds={liveTargetIds}
            />
          </UIProvider>
        </MemoryRouter>,
      );

    const bodyRows = () => screen.getAllByRole('row').slice(1);

    it('greys out the row on the deleted target', () => {
      renderWithLiveTargets(new Set([createTargetId('target-1')]));

      expect(bodyRows()[1]).toHaveAttribute('aria-disabled', 'true');
    });

    it('leaves the row on a live target as it is', () => {
      renderWithLiveTargets(new Set([createTargetId('target-1')]));

      expect(bodyRows()[0]).not.toHaveAttribute('aria-disabled');
    });

    it('greys out nothing while the live targets are not known yet', () => {
      renderWithLiveTargets(undefined);

      bodyRows().forEach((row) =>
        expect(row).not.toHaveAttribute('aria-disabled'),
      );
    });
  });

  describe('the package a distribution went out in', () => {
    const renderWithPackage = (livePackageIds?: ReadonlySet<PackageId>) =>
      render(
        <MemoryRouter>
          <UIProvider>
            <DeploymentsHistory
              deployments={[
                artifactDistribution([
                  {
                    ...withCommandVersion(1, 4),
                    package: { id: packageId, name: 'Backend guidelines' },
                  } as CommandDistributionHistoryEntry['distributedPackages'][number],
                ]),
              ]}
              type="command"
              entityId={commandId}
              usersMap={{ [authorId]: 'joan.racenet' }}
              orgSlug="acme"
              spaceSlug="global"
              livePackageIds={livePackageIds}
            />
          </UIProvider>
        </MemoryRouter>,
      );

    it('links to a package that still exists', () => {
      renderWithPackage(new Set([packageId]));

      expect(
        screen.getByRole('link', { name: 'Backend guidelines' }),
      ).toBeInTheDocument();
    });

    it('names a deleted package without linking to it', () => {
      renderWithPackage(new Set());

      expect(screen.getByText('Backend guidelines')).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Backend guidelines' }),
      ).not.toBeInTheDocument();
    });

    it('links while the live packages are not known yet', () => {
      renderWithPackage(undefined);

      expect(
        screen.getByRole('link', { name: 'Backend guidelines' }),
      ).toBeInTheDocument();
    });
  });

  describe("a package's history", () => {
    it('shows the release a pinned destination was sent', () => {
      renderHistory([distribution(1, {}, 'add', '1.2.0')]);

      expect(version()).toHaveTextContent('1.2.0');
    });

    it('shows the live package as unreleased, based on the release it was built on', () => {
      renderHistory([distribution(1, {}, 'add', '*', '1.1.0')]);

      expect(version()).toHaveTextContent('based on 1.1.0');
    });

    it('shows the live package as unreleased alone when it had no release yet', () => {
      renderHistory([distribution(1, {}, 'add', '*', null)]);

      expect(version()?.textContent).toBe('Unreleased');
    });

    it('shows a dash when the distribution recorded no version', () => {
      renderHistory([distribution(1)]);

      expect(version()).toHaveTextContent('-');
    });

    it('reads the version off this package, not another one sent with it', () => {
      const base = distribution(1, {}, 'add', '1.2.0');
      renderHistory([
        {
          ...base,
          distributedPackages: [
            {
              ...base.distributedPackages[0],
              id: createDistributedPackageId('distributed-other'),
              packageId: createPackageId('package-other'),
              versionSpec: '9.9.9',
            },
            ...base.distributedPackages,
          ],
        },
      ]);

      expect(version()).toHaveTextContent('1.2.0');
    });
  });

  describe('the package column of an artifact history', () => {
    const withPackage = <DP extends { packageId: typeof packageId }>(
      dp: DP,
    ) => ({
      ...dp,
      package: {
        id: dp.packageId,
        name: 'Backend package',
        slug: 'backend-package',
      } as DistributedPackageHistoryEntry['package'],
    });

    it('shows the package version beside the package name', () => {
      renderCommandHistory([
        artifactDistribution([
          withPackage({
            ...withCommandVersion(1, 4),
            versionSpec: '1.2.0',
          }),
        ]),
      ]);

      expect(packageVersions()).toEqual(['1.2.0']);
    });

    it('shows an unreleased package with its base release on one line', () => {
      renderCommandHistory([
        artifactDistribution([
          withPackage({
            ...withCommandVersion(1, 4),
            versionSpec: '*',
            latestReleaseVersion: '1.1.0',
          }),
        ]),
      ]);

      expect(packageVersions()).toEqual(['Unreleased, based on 1.1.0']);
    });

    it('shows a dash beside the name when no version was recorded', () => {
      renderStandardHistory([
        artifactDistribution([withPackage(withStandardVersion(1, 7))]),
      ]);

      expect(packageVersions()).toEqual(['-']);
    });
  });

  describe("a command's history", () => {
    it('shows the version of the command that was distributed', () => {
      renderCommandHistory([artifactDistribution([withCommandVersion(1, 4)])]);

      expect(version()).toHaveTextContent('4');
    });

    it('reads the version off the package that carries the command', () => {
      renderCommandHistory([
        artifactDistribution([
          withCommandVersion(1, 9, createCommandId('another-command')),
          withCommandVersion(2, 4),
        ]),
      ]);

      expect(version()).toHaveTextContent('4');
    });

    it('says nothing when no package carries the command', () => {
      renderCommandHistory([
        artifactDistribution([
          withCommandVersion(1, 9, createCommandId('another-command')),
        ]),
      ]);

      expect(version()).toHaveTextContent('-');
    });

    it('marks a distribution that took the command out', () => {
      renderCommandHistory([
        artifactDistribution([withCommandVersion(1, 4, commandId, 'remove')]),
      ]);

      expect(screen.getByText('Removed')).toBeInTheDocument();
    });

    it('marks nothing when the command was put in', () => {
      renderCommandHistory([artifactDistribution([withCommandVersion(1, 4)])]);

      expect(screen.queryByText('Removed')).not.toBeInTheDocument();
    });
  });

  describe("a standard's history", () => {
    it('shows the version of the standard that was distributed', () => {
      renderStandardHistory([
        artifactDistribution([withStandardVersion(1, 7)]),
      ]);

      expect(version()).toHaveTextContent('7');
    });

    it('marks a distribution that took the standard out', () => {
      renderStandardHistory([
        artifactDistribution([withStandardVersion(1, 7, 'remove')]),
      ]);

      expect(screen.getByText('Removed')).toBeInTheDocument();
    });

    it('marks nothing when the standard was put in', () => {
      renderStandardHistory([
        artifactDistribution([withStandardVersion(1, 7)]),
      ]);

      expect(screen.queryByText('Removed')).not.toBeInTheDocument();
    });
  });

  describe("a skill's history", () => {
    it('shows the version of the skill that was distributed', () => {
      renderSkillHistory([artifactDistribution([withSkillVersion(1, 2)])]);

      expect(version()).toHaveTextContent('2');
    });

    it('marks a distribution that took the skill out', () => {
      renderSkillHistory([
        artifactDistribution([withSkillVersion(1, 2, 'remove')]),
      ]);

      expect(screen.getByText('Removed')).toBeInTheDocument();
    });

    it('marks nothing when the skill was put in', () => {
      renderSkillHistory([artifactDistribution([withSkillVersion(1, 2)])]);

      expect(screen.queryByText('Removed')).not.toBeInTheDocument();
    });
  });
});
