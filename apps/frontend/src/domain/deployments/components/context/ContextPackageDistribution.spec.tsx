import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createTargetId,
} from '@packmind/types';
import type { PackageResponse } from '@packmind/types';
import type { Mock } from 'vitest';

import { ContextPackageDistribution } from './ContextPackageDistribution';
import type { PackageDestination } from './buildPackageDestinations';
import { usePackageDestinations } from './usePackageDestinations';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import type { SyncScope } from '../redesign/components/SyncSurface';

/*
 * Every hook this tab reaches for is mocked at its module path, so no query
 * client is needed. The marketplace hook sits behind the proprietary alias and
 * is mocked under exactly the specifier the component imports, since the Open
 * Source build resolves that same specifier to a stub.
 */
vi.mock('./usePackageDestinations', () => ({
  usePackageDestinations: vi.fn(),
}));

const mockAuthProbe = vi.fn();

vi.mock('../../../git/api/queries/GitProviderQueries', () => ({
  useGetGitProvidersQuery: vi.fn(),
  useCheckProviderAuthQuery: () => mockAuthProbe(),
}));

const mockSyncMutate = vi.fn();

vi.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}));

/*
 * The readiness behind the row's `Create a release`. Nothing ready by default,
 * so the rows this suite is about are unchanged: the button only appears on a
 * landing that has nowhere left to be distributed to.
 */
vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useListPackageReleasesQuery: () => ({ data: undefined }),
  useDeployPackagesMutation: () => ({ mutateAsync: vi.fn() }),
  useSyncRepositoryFromLockFilesMutation: () => ({
    mutate: mockSyncMutate,
    isPending: false,
  }),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/marketplaces/components/redesign/useMarketplaceBatchDistribution',
  () => ({ useMarketplaceBatchDistribution: () => vi.fn() }),
);

/** The events themselves are another component's subject; this needs only the fact of them. */
vi.mock('../PackageDistributionList', () => ({
  PackageDistributionList: () => <div data-testid="distribution-history" />,
}));

const REASON =
  'Push rejected: branch protection on main requires a pull request';

const providerId = createGitProviderId('provider-1');
const repo = {
  id: createGitRepoId('repo-1'),
  owner: 'optimetriks',
  name: 'smala-native',
  providerId,
};

const failedDestination: PackageDestination = {
  key: 'r:repo-1::target-1',
  kind: 'repository',
  name: 'optimetriks/smala-native',
  details: ['v4staging'],
  state: 'failed',
  behindArtifacts: [],
  behindCount: 0,
  hasWorkToSend: false,
  remedy: 'none' as const,
  canReleaseAndUpdate: false,
  installKey: 'repo-1::target-1',
  landing: { repo, branch: 'v4staging' },
  prUrl: null,
  failureReason: REASON,
  lastActivityAt: null,
  hasStaleReport: false,
};

const pkg = {
  id: createPackageId('pkg-1'),
  name: 'Fp-core',
  spaceId: createSpaceId('space-1'),
} as unknown as PackageResponse;

function renderTab(syncScope: SyncScope | null = null) {
  return render(
    <UIProvider>
      <ContextPackageDistribution
        pkg={pkg}
        drift={null}
        packages={[]}
        isLoading={false}
        isError={false}
        syncScope={syncScope}
        onStartSync={vi.fn()}
        onSyncClose={vi.fn()}
      />
    </UIProvider>,
  );
}

describe('ContextPackageDistribution', () => {
  beforeEach(() => {
    (usePackageDestinations as Mock).mockReturnValue({
      destinations: [failedDestination],
      marketplaces: [],
      isLoading: false,
    });
    (useGetGitProvidersQuery as Mock).mockReturnValue({
      data: { providers: [{ id: providerId, hasAuth: true }] },
      isLoading: false,
    });
    (useAuthContext as Mock).mockReturnValue({
      organization: { id: createOrganizationId('org-1') },
    });
    mockAuthProbe.mockReturnValue({
      isLoading: false,
      isFetching: false,
      isError: false,
      data: { ok: true },
    });
  });

  describe('a destination whose last distribution failed', () => {
    it('reads its reason out on the row, without the events being opened at all', async () => {
      renderTab();

      await userEvent.click(
        screen.getByRole('button', {
          name: 'Show why the last distribution failed on optimetriks/smala-native',
        }),
      );

      expect(screen.getByText(REASON)).toBeInTheDocument();
      expect(
        screen.queryByTestId('distribution-history'),
      ).not.toBeInTheDocument();
    });

    it('opens the events from the row, for the reader the reason did not satisfy', async () => {
      renderTab();

      await userEvent.click(
        screen.getByRole('button', {
          name: 'Show why the last distribution failed on optimetriks/smala-native',
        }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'See the full run' }),
      );

      expect(screen.getByTestId('distribution-history')).toBeInTheDocument();
    });
  });

  describe('syncing a repository from its row', () => {
    const syncButton = () =>
      screen.getByRole('button', {
        name: 'Sync optimetriks/smala-native',
      });

    it('syncs that repository', async () => {
      renderTab();

      await userEvent.click(syncButton());

      expect(mockSyncMutate).toHaveBeenCalledWith(
        { gitRepoId: repo.id },
        expect.anything(),
      );
    });

    describe('when the Git connection is broken', () => {
      beforeEach(() => {
        mockAuthProbe.mockReturnValue({
          isLoading: false,
          isFetching: false,
          isError: false,
          data: { ok: false, reason: 'unauthorized' },
        });
      });

      it('cannot be started', () => {
        renderTab();

        expect(syncButton()).toBeDisabled();
      });

      it('says the connection is broken, and why', async () => {
        renderTab();

        await userEvent.hover(syncButton().parentElement as HTMLElement);

        expect(
          await screen.findByText(
            'Git connection broken. Token rejected by the provider. Re-authenticate to restore access.',
          ),
        ).toBeInTheDocument();
      });
    });

    describe('when the repository was installed with the CLI', () => {
      beforeEach(() => {
        (useGetGitProvidersQuery as Mock).mockReturnValue({
          data: { providers: [{ id: providerId, hasAuth: false }] },
          isLoading: false,
        });
      });

      it('says so', async () => {
        renderTab();

        await userEvent.hover(syncButton().parentElement as HTMLElement);

        expect(
          await screen.findByText(/^Installed with the CLI/),
        ).toBeInTheDocument();
      });
    });

    describe('when its lock names an unknown package', () => {
      beforeEach(() => {
        mockSyncMutate.mockImplementation((_variables, { onSuccess }) =>
          onSuccess({
            targets: [
              {
                targetId: createTargetId('target-1'),
                path: '/',
                status: 'updated',
                warnings: [{ type: 'unknown_package', packageSlug: 'legacy' }],
              },
            ],
          }),
        );
      });

      it('names the repository beside the target', async () => {
        renderTab();

        await userEvent.click(syncButton());

        expect(await screen.findByRole('listitem')).toHaveTextContent(
          'legacy, listed in optimetriks/smala-native · Repository root',
        );
      });
    });
  });

  describe('while an update is being reviewed', () => {
    const scope: SyncScope = { kind: 'package', packageId: pkg.id };

    it('opens the review in a drawer', async () => {
      renderTab(scope);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('keeps the destinations on screen behind it', async () => {
      renderTab(scope);

      await screen.findByRole('dialog');

      expect(screen.getByText('optimetriks/smala-native')).toBeInTheDocument();
    });
  });
});
