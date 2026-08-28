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

import { PackageDetailPane } from './PackageDetailPane';
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

const renderPane = (props?: {
  surfaceOwnsDistribute?: boolean;
  installCount?: number;
  onSyncPackage?: (pkgId: string, installKeys?: string[]) => void;
  providersWithToken?: Set<GitProviderId>;
}) => {
  const onSyncPackage = props?.onSyncPackage ?? vi.fn();
  render(
    <MemoryRouter>
      <UIProvider>
        <PackageDetailPane
          pkg={driftedPackage(props?.installCount ?? 3)}
          providersWithToken={
            props?.providersWithToken ?? new Set([providerId])
          }
          isProvidersLoading={false}
          onSyncPackage={onSyncPackage}
          distributionHistory={null}
          surfaceOwnsDistribute={props?.surfaceOwnsDistribute}
        />
      </UIProvider>
    </MemoryRouter>,
  );
  return { onSyncPackage };
};

describe('PackageDetailPane', () => {
  describe('by default', () => {
    it('keeps the header distribute button', () => {
      renderPane();

      expect(
        screen.getByRole('button', { name: /Distribute package/ }),
      ).toBeInTheDocument();
    });

    it('asks for a selection before redistributing', () => {
      renderPane();

      expect(
        screen.getByText('Select distributions to redistribute.'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Redistribute to selected/ }),
      ).toBeDisabled();
    });
  });

  /*
   * The Context surface carries `Distribute` in its own header, so the pane
   * drops the package-wide button it used to keep and its footer takes that
   * job over.
   */
  describe('when the surface owns the distribute control', () => {
    it('drops the header distribute button', () => {
      renderPane({ surfaceOwnsDistribute: true });

      expect(
        screen.queryByRole('button', { name: /Distribute package/ }),
      ).not.toBeInTheDocument();
    });

    it('offers every drifted distribution when none are ticked', () => {
      renderPane({ surfaceOwnsDistribute: true, installCount: 3 });

      expect(screen.getByText('3 distributions behind.')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Redistribute all 3/ }),
      ).toBeEnabled();
    });

    it('redistributes the whole package when none are ticked', () => {
      const { onSyncPackage } = renderPane({ surfaceOwnsDistribute: true });

      fireEvent.click(
        screen.getByRole('button', { name: /Redistribute all 3/ }),
      );

      expect(onSyncPackage).toHaveBeenCalledWith(packageId);
    });

    it('narrows to the ticked distributions once there are some', async () => {
      const { onSyncPackage } = renderPane({
        surfaceOwnsDistribute: true,
        installCount: 2,
      });

      await userEvent.click(
        screen.getByRole('checkbox', {
          name: 'Select packmind/service-1 (default)',
        }),
      );

      expect(
        screen.getByRole('button', { name: /Redistribute to selected/ }),
      ).toBeEnabled();

      fireEvent.click(
        screen.getByRole('button', { name: /Redistribute to selected/ }),
      );

      expect(onSyncPackage).toHaveBeenCalledWith(packageId, [
        'repo-1::target-1',
      ]);
    });

    it('disables the footer when every drifted distribution is locked', () => {
      renderPane({
        surfaceOwnsDistribute: true,
        providersWithToken: new Set<GitProviderId>(),
      });

      expect(
        screen.getByRole('button', { name: /Redistribute all 3/ }),
      ).toBeDisabled();
    });
  });
});
