import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  createGitProviderId,
  createGitRepoId,
  createPackageId,
  createStandardId,
  createTargetId,
  DistributionStatus,
  type GitProviderId,
} from '@packmind/types';

import {
  PackageDetailPane,
  type DistributionHistoryTarget,
} from './PackageDetailPane';
import type { PackageDrift, RepoInstall } from '../types';

const providerId = createGitProviderId('provider-1');
const packageId = createPackageId('package-1');

const behindInstall = (index: number): RepoInstall => ({
  repo: {
    id: createGitRepoId(`repo-${index}`),
    owner: 'packmind',
    name: `service-${index}`,
    providerId,
  },
  target: { id: createTargetId(`target-${index}`), name: 'default' },
  branch: 'main',
  deployedVersion: 1,
  lastDeployedAt: '2026-08-01T10:00:00.000Z',
  driftReason: 'behind',
});

/** A package behind on `installCount` distributions, none of them locked. */
const driftedPackage = (installCount: number): PackageDrift => {
  const installs = Array.from({ length: installCount }, (_, i) =>
    behindInstall(i + 1),
  );
  return {
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
        installs,
      },
    ],
    installLocations: installs.map((install) => ({
      repo: install.repo,
      target: install.target,
      branch: install.branch,
      lastDistributionStatus: DistributionStatus.success,
      lastDistributedAt: install.lastDeployedAt,
    })),
  };
};

/** The same package, with its last distribution failed on one destination. */
const packageWithFailure = (installCount: number): PackageDrift => {
  const pkg = driftedPackage(installCount);
  return {
    ...pkg,
    installLocations: pkg.installLocations.map((location, index) =>
      index === 0
        ? { ...location, lastDistributionStatus: DistributionStatus.failure }
        : location,
    ),
  };
};

const renderPane = (props?: {
  surfaceOwnsDistribute?: boolean;
  installCount?: number;
  onSyncPackage?: (pkgId: string, installKeys?: string[]) => void;
  providersWithToken?: Set<GitProviderId>;
  distributionHistory?: DistributionHistoryTarget | null;
  hasFailure?: boolean;
  surfaceOwnsHistory?: boolean;
}) => {
  const onSyncPackage = props?.onSyncPackage ?? vi.fn();
  const installCount = props?.installCount ?? 3;
  render(
    <MemoryRouter>
      <UIProvider>
        <PackageDetailPane
          pkg={
            props?.hasFailure
              ? packageWithFailure(installCount)
              : driftedPackage(installCount)
          }
          providersWithToken={
            props?.providersWithToken ?? new Set([providerId])
          }
          isProvidersLoading={false}
          onSyncPackage={onSyncPackage}
          distributionHistory={props?.distributionHistory ?? null}
          surfaceOwnsDistribute={props?.surfaceOwnsDistribute}
          surfaceOwnsHistory={props?.surfaceOwnsHistory}
        />
      </UIProvider>
    </MemoryRouter>,
  );
  return { onSyncPackage };
};

describe('PackageDetailPane', () => {
  const tickFirstInstall = () =>
    userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Select packmind/service-1 (default)',
      }),
    );

  it('offers no selection bar before anything is ticked', () => {
    renderPane();

    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  /*
   * The deployments overview and the package detail page, which are the two
   * surfaces of the older navigation. Their package-wide push lives in this
   * pane's own header and has to keep working.
   */
  describe('by default', () => {
    it('keeps the header distribute button', () => {
      renderPane();

      expect(
        screen.getByRole('button', { name: /Distribute package/ }),
      ).toBeInTheDocument();
    });

    it('pushes the whole package from that button', () => {
      const { onSyncPackage } = renderPane();

      fireEvent.click(
        screen.getByRole('button', { name: /Distribute package/ }),
      );

      expect(onSyncPackage).toHaveBeenCalledWith(packageId);
    });

    it('still offers the subset push from the list', async () => {
      renderPane();
      await tickFirstInstall();

      expect(
        screen.getByRole('button', { name: /Update 1 destination/ }),
      ).toBeInTheDocument();
    });
  });

  /*
   * The Context surface carries the package-wide push in its own header, so the
   * pane drops the button it used to keep. The subset push is a different
   * question and stays either way.
   */
  describe('when the surface owns the distribute control', () => {
    it('drops the header distribute button', () => {
      renderPane({ surfaceOwnsDistribute: true });

      expect(
        screen.queryByRole('button', { name: /Distribute package/ }),
      ).not.toBeInTheDocument();
    });

    it('keeps the subset push', async () => {
      renderPane({ surfaceOwnsDistribute: true });
      await tickFirstInstall();

      expect(
        screen.getByRole('button', { name: /Update 1 destination/ }),
      ).toBeInTheDocument();
    });
  });

  describe('when one destination is ticked', () => {
    it('counts the pick', async () => {
      renderPane();
      await tickFirstInstall();

      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('names the destination it would push in the singular', async () => {
      renderPane();
      await tickFirstInstall();

      expect(
        screen.getByRole('button', { name: /Update 1 destination/ }),
      ).toBeInTheDocument();
    });

    it('pushes that one and no other', async () => {
      const { onSyncPackage } = renderPane({ installCount: 3 });
      await tickFirstInstall();

      fireEvent.click(
        screen.getByRole('button', { name: /Update 1 destination/ }),
      );

      expect(onSyncPackage).toHaveBeenCalledWith(packageId, [
        'repo-1::target-1',
      ]);
    });

    it('drops the bar again on clear', async () => {
      renderPane();
      await tickFirstInstall();

      await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });
  });

  describe('when two destinations are ticked', () => {
    it('names them in the plural', async () => {
      renderPane({ installCount: 3 });
      await tickFirstInstall();
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: 'Select packmind/service-2 (default)',
        }),
      );

      expect(
        screen.getByRole('button', { name: /Update 2 destinations/ }),
      ).toBeInTheDocument();
    });
  });

  describe('when every drifted destination is locked', () => {
    it('leaves nothing to tick', () => {
      renderPane({ providersWithToken: new Set<GitProviderId>() });

      expect(
        screen.getByRole('checkbox', {
          name: 'Select packmind/service-1 (default)',
        }),
      ).toBeDisabled();
    });

    it('disables the header push with it', () => {
      renderPane({ providersWithToken: new Set<GitProviderId>() });

      expect(
        screen.getByRole('button', { name: /Distribute package/ }),
      ).toBeDisabled();
    });
  });
  /*
   * Without this link the events are reachable only from a failure, so a
   * package that has always been pushed cleanly has no way to see its own
   * distribution record.
   */
  describe('when the surface hands the pane a history page', () => {
    it('links to it from the summary', () => {
      renderPane({ distributionHistory: { href: '/history' } });

      expect(
        screen.getByRole('link', { name: 'Distribution history' }),
      ).toHaveAttribute('href', '/history');
    });
  });

  describe('when the surface shows the events itself', () => {
    it('asks it to rather than routing away', async () => {
      const onOpen = vi.fn();
      renderPane({ distributionHistory: { onOpen } });

      await userEvent.click(
        screen.getByRole('button', { name: 'Distribution history' }),
      );

      expect(onOpen).toHaveBeenCalled();
    });
  });

  describe('when the surface has no events to point at', () => {
    it('offers nothing rather than a dead link', () => {
      renderPane({ distributionHistory: null });

      expect(
        screen.queryByRole('link', { name: 'Distribution history' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the surface carries a standing entry of its own', () => {
    const renderOwned = () =>
      renderPane({
        surfaceOwnsHistory: true,
        distributionHistory: { href: '/history' },
      });

    it('drops the summary link rather than doubling it', () => {
      renderOwned();

      expect(
        screen.queryByRole('link', { name: 'Distribution history' }),
      ).not.toBeInTheDocument();
    });

    it('still answers a failure with the events', () => {
      renderPane({
        surfaceOwnsHistory: true,
        hasFailure: true,
        distributionHistory: { href: '/history' },
      });

      expect(
        screen.getByRole('link', {
          name: /View distribution history for error details/,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('when a destination failed its last distribution', () => {
    const renderFailed = () =>
      renderPane({
        hasFailure: true,
        distributionHistory: { href: '/history' },
      });

    it('drops the summary link', () => {
      renderFailed();

      expect(
        screen.queryByRole('link', { name: 'Distribution history' }),
      ).not.toBeInTheDocument();
    });

    it('leaves the alert to carry the only way in', () => {
      renderFailed();

      expect(
        screen.getByRole('link', {
          name: /View distribution history for error details/,
        }),
      ).toHaveAttribute('href', '/history');
    });
  });
});
