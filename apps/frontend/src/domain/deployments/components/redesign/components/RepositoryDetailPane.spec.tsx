import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import type { GitProviderId } from '@packmind/types';
import {
  createGitProviderId,
  createGitRepoId,
  createCommandId,
  createPackageId,
  createStandardId,
  createTargetId,
  DistributionStatus,
} from '@packmind/types';

import { RepositoryDetailPane } from './RepositoryDetailPane';
import type { PackageDrift, RepoInstall, RepositoryDrift } from '../types';

const providerId = createGitProviderId('provider-1');
const repoId = createGitRepoId('repo-1');
const targetId = createTargetId('target-1');
const packageId = createPackageId('package-1');

const repoRef = {
  id: repoId,
  owner: 'packmind',
  name: 'services',
  providerId,
};

const targetRef = { id: targetId, name: 'default', isDefault: true };

const install: RepoInstall = {
  repo: repoRef,
  target: targetRef,
  branch: 'main',
  deployedVersion: 1,
  lastDeployedAt: '2026-08-01T10:00:00.000Z',
  driftReason: 'behind',
};

/** One package, behind on this repo's only target, on an unlocked provider. */
const driftedPackage: PackageDrift = {
  id: packageId,
  name: 'Backend guidelines',
  description: 'How the services are written.',
  artifacts: [
    {
      id: createStandardId('standard-1'),
      kind: 'standard',
      name: 'Error handling',
      packmindVersion: 2,
      isDeleted: false,
      isPending: false,
      installs: [install],
    },
  ],
  installLocations: [
    {
      repo: repoRef,
      target: targetRef,
      branch: 'main',
      lastDistributionStatus: DistributionStatus.success,
      lastDistributedAt: install.lastDeployedAt,
    },
  ],
};

/** The same package, carrying a command instead, to check the row names it. */
const withDriftedCommand: RepositoryDrift = {
  id: repoId,
  repo: repoRef,
  branch: 'main',
  targets: [
    {
      id: targetId,
      target: targetRef,
      packages: [
        {
          ...driftedPackage,
          artifacts: [
            {
              ...driftedPackage.artifacts[0],
              id: createCommandId('command-1'),
              kind: 'command',
              name: 'cut-release',
            },
          ],
        },
      ],
    },
  ],
};

const repo: RepositoryDrift = {
  id: repoId,
  repo: repoRef,
  branch: 'main',
  targets: [{ id: targetId, target: targetRef, packages: [driftedPackage] }],
};

const GIT_SETTINGS_HREF = '/org/packmind/settings/git';

function renderPane(
  onSyncPackageOnTarget = vi.fn(),
  paneRepo: RepositoryDrift = repo,
  {
    /** Connected by default: the locked repository is its own set of tests. */
    providersWithToken = new Set([providerId]),
    gitSettingsHref = GIT_SETTINGS_HREF,
  }: {
    providersWithToken?: Set<GitProviderId>;
    gitSettingsHref?: string | null;
  } = {},
) {
  render(
    <MemoryRouter>
      <UIProvider>
        <RepositoryDetailPane
          repo={paneRepo}
          providersWithToken={providersWithToken}
          isProvidersLoading={false}
          onSyncPackageOnTarget={onSyncPackageOnTarget}
          onSyncRepository={vi.fn()}
          packageHistoryHref={() => null}
          gitSettingsHref={gitSettingsHref}
        />
      </UIProvider>
    </MemoryRouter>,
  );
  return { onSyncPackageOnTarget };
}

/** No provider holds credentials, which is what locks the whole repository. */
const DISCONNECTED = { providersWithToken: new Set<GitProviderId>() };

/** The one checkbox this fixture offers: the drifted package on the target. */
function rowCheckbox() {
  return screen.getByRole('checkbox', {
    name: `Select ${driftedPackage.name} for distribution`,
  });
}

describe('RepositoryDetailPane', () => {
  describe('when nothing is selected', () => {
    it('offers the repository-wide distribution', () => {
      renderPane();

      expect(
        screen.getByRole('button', { name: /Distribute repository/ }),
      ).toBeInTheDocument();
    });
  });

  describe('when a drifted row is selected', () => {
    it('distributes that landing alone', async () => {
      const { onSyncPackageOnTarget } = renderPane();

      await userEvent.click(rowCheckbox());
      await userEvent.click(
        screen.getByRole('button', { name: /^Distribute selected/ }),
      );

      expect(onSyncPackageOnTarget).toHaveBeenCalledTimes(1);
      expect(onSyncPackageOnTarget).toHaveBeenCalledWith(
        packageId,
        repoId,
        targetId,
      );
    });
  });

  describe('what a drifted row states', () => {
    it('names the unit it counts', () => {
      renderPane();

      expect(screen.getByText(/1 of 1 component drifted/)).toBeInTheDocument();
    });

    /* `1 of 1 behind`, which named neither the unit nor the canonical state. */
    it('no longer says behind', () => {
      renderPane();

      expect(screen.queryByText(/behind/)).not.toBeInTheDocument();
    });
  });

  /*
   * A package and a component of it can carry the same name, and the reported
   * pane held one of each called Typescript. Opening the package showed a row
   * with an icon and that name, and nothing said which of the three kinds it
   * was.
   */
  describe('when a drifted package is opened', () => {
    const openPackage = async () =>
      userEvent.click(
        screen.getByRole('button', {
          name: new RegExp(driftedPackage.name),
          expanded: false,
        }),
      );

    it('names what kind of component each row is', async () => {
      renderPane();

      await openPackage();

      expect(screen.getByText('Error handling')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('names a command as a command', async () => {
      renderPane(vi.fn(), withDriftedCommand);

      await openPackage();

      expect(screen.getByText('Command')).toBeInTheDocument();
      expect(screen.queryByText('Standard')).not.toBeInTheDocument();
    });

    it('says nothing about a kind until the package is opened', () => {
      renderPane();

      expect(screen.queryByText('Standard')).not.toBeInTheDocument();
    });
  });
  describe('when Packmind has no Git connection to the repository', () => {
    it('says what Packmind cannot do rather than the mechanism behind it', () => {
      renderPane(vi.fn(), repo, DISCONNECTED);

      expect(
        screen.getByText('Packmind cannot push to this repository'),
      ).toBeInTheDocument();
    });

    it('says nothing about tokens', () => {
      renderPane(vi.fn(), repo, DISCONNECTED);

      expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
    });

    it('says what a checkout does about it', () => {
      renderPane(vi.fn(), repo, DISCONNECTED);

      expect(screen.getByText(/packmind install/)).toBeInTheDocument();
    });

    it('keeps the explanation one hover away', async () => {
      renderPane(vi.fn(), repo, DISCONNECTED);

      await userEvent.hover(
        screen.getByRole('button', { name: 'Why Packmind cannot push here' }),
      );

      expect(
        await screen.findByText(/holds no credentials for this repository/),
      ).toBeInTheDocument();
    });

    it('says nothing about credentials until asked', () => {
      renderPane(vi.fn(), repo, DISCONNECTED);

      expect(
        screen.queryByText(/holds no credentials for this repository/),
      ).not.toBeInTheDocument();
    });

    it('offers the way to connect it', () => {
      renderPane(vi.fn(), repo, DISCONNECTED);

      expect(
        screen.getByRole('link', { name: 'Add a Git connection' }),
      ).toHaveAttribute('href', GIT_SETTINGS_HREF);
    });

    describe('and there is no organisation to point at', () => {
      it('keeps the explanation', () => {
        renderPane(vi.fn(), repo, { ...DISCONNECTED, gitSettingsHref: null });

        expect(
          screen.getByText('Packmind cannot push to this repository'),
        ).toBeInTheDocument();
      });

      it('drops the offer', () => {
        renderPane(vi.fn(), repo, { ...DISCONNECTED, gitSettingsHref: null });

        expect(
          screen.queryByRole('link', { name: 'Add a Git connection' }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('when the repository is connected', () => {
    it('says nothing about a missing connection', () => {
      renderPane();

      expect(
        screen.queryByText('Packmind cannot push to this repository'),
      ).not.toBeInTheDocument();
    });
  });
});
