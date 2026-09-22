import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import type {
  PackageReleaseReadiness,
  PackageReleaseSummary,
  PackageResponse,
} from '@packmind/types';
import type { Mock } from 'vitest';

import { ContextPackagePane } from './ContextPackagePane';
import {
  useDeletePackagesBatchMutation,
  useListPackageDeploymentsQuery,
  useListPackageReleasesQuery,
  useRemoveArtefactsFromPackageMutation,
} from '../../api/queries/DeploymentsQueries';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import { usePackageDestinations } from './usePackageDestinations';
import { usePackageDrift } from './usePackageDrift';
import { useDeleteContextComponent } from './useDeleteContextComponent';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { useGetPackageReleaseQuery } from '../../api/queries/DeploymentsQueries';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';

/*
 * Every query the pane and the version area reach for is mocked at its module
 * path, so no `QueryClientProvider` is needed - the same arrangement as
 * `ContextComponentDetail.spec.tsx`.
 */
vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useListPackageDeploymentsQuery: vi.fn(),
  useDeletePackagesBatchMutation: vi.fn(),
  useRemoveArtefactsFromPackageMutation: vi.fn(),
  useListPackageReleasesQuery: vi.fn(),
  useGetPackageReleaseQuery: vi.fn(),
  useCreatePackageReleaseMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../../hooks/usePackageDeploymentStatus', () => ({
  usePackageDeploymentStatus: vi.fn(),
}));

vi.mock('./usePackageDestinations', () => ({
  usePackageDestinations: vi.fn(),
}));

vi.mock('./usePackageDrift', () => ({
  usePackageDrift: vi.fn(),
}));

vi.mock('./useDeleteContextComponent', () => ({
  useDeleteContextComponent: vi.fn(),
}));

vi.mock('../../../git/api/queries/GitProviderQueries', () => ({
  useGetGitProvidersQuery: vi.fn(),
}));

/*
 * The pane mounts no auth provider here, and the version area is behind a
 * feature flag read from the signed-in user's email. Most tests are that user.
 */
vi.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}));

const STAFF_EMAIL = 'someone@packmind.com';

vi.mock(
  '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider',
  () => ({
    useAnalytics: () => ({ track: vi.fn() }),
  }),
);

/*
 * The header's other children are stood in for: they each reach for queries of
 * their own, and none of them is what this spec is reading.
 */
vi.mock('../PackageDeployments/DeployPackageButton', () => ({
  DeployPackageButton: () => <div data-testid="deploy-button" />,
}));

vi.mock('./AddComponentsDrawer', () => ({
  AddComponentsDrawer: () => <div data-testid="add-components-drawer" />,
}));

vi.mock('./EditPackageDetailsDrawer', () => ({
  EditPackageDetailsDrawer: () => <div data-testid="edit-details-drawer" />,
}));

vi.mock('./MoveComponentDrawer', () => ({
  MoveComponentDrawer: () => <div data-testid="move-drawer" />,
}));

vi.mock('./ContextPackageDistribution', () => ({
  ContextPackageDistribution: () => <div data-testid="distribution-tab" />,
}));

vi.mock('../PackagesPopover', () => ({
  RemoveArtifactFromPackageConfirm: () => <div data-testid="remove-artifact" />,
}));

vi.mock('../RemovePackageFromTargets', () => ({
  RemovePackageFromTargetsDialog: () => <div data-testid="remove-targets" />,
}));

const packageId = createPackageId('pkg-1');
const spaceId = createSpaceId('space-1');
const organizationId = createOrganizationId('org-1');

const pkg: PackageResponse = {
  id: packageId,
  name: 'Backend conventions',
  slug: 'backend-conventions',
  description: '',
  spaceId,
  createdBy: createUserId('user-1'),
  recipes: [],
  standards: [],
  skills: [],
  commands: [],
};

const READY_NEVER_RELEASED: PackageReleaseReadiness = {
  currentVersion: null,
  verdict: 'ready',
  nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
  outdatedComponents: [],
};

function resetHooks() {
  (useAuthContext as Mock).mockReturnValue({ user: { email: STAFF_EMAIL } });
  (useListPackageDeploymentsQuery as Mock).mockReturnValue({ data: [] });
  (useDeletePackagesBatchMutation as Mock).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  (useRemoveArtefactsFromPackageMutation as Mock).mockReturnValue({
    mutateAsync: vi.fn(),
  });
  (useDeleteContextComponent as Mock).mockReturnValue({
    deleteComponent: vi.fn(),
    isDeleting: false,
  });
  (usePackageDeploymentStatus as Mock).mockReturnValue({
    getDeployedTargets: () => [],
    getDeployedMarketplaces: () => [],
  });
  (usePackageDrift as Mock).mockReturnValue({
    drift: null,
    packages: [],
    isLoading: false,
    isError: false,
  });
  (usePackageDestinations as Mock).mockReturnValue({
    destinations: [],
    marketplaces: [],
    isLoading: false,
  });
  (useGetGitProvidersQuery as Mock).mockReturnValue({
    data: { providers: [] },
    isLoading: false,
  });
  (useGetPackageReleaseQuery as Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
  });
}

async function renderPane(
  readiness: PackageReleaseReadiness,
  {
    releases = [],
    address = '/',
  }: {
    releases?: PackageReleaseSummary[];
    /** The address the pane opens at, which is what names the version read. */
    address?: string;
  } = {},
) {
  (useListPackageReleasesQuery as Mock).mockReturnValue({
    data: {
      releases:
        releases.length > 0
          ? releases
          : readiness.currentVersion
            ? [{ version: readiness.currentVersion, releasedAt: null }]
            : [],
      readiness,
    },
    isLoading: false,
  });

  await act(async () => {
    render(
      <UIProvider>
        <MemoryRouter initialEntries={[address]}>
          <ContextPackagePane
            pkg={pkg}
            packages={[pkg]}
            catalogue={{ standards: [], commands: [], skills: [] }}
            groups={[]}
            total={3}
            detail={null}
            detailFile={null}
            detailRule={null}
            spaceId={spaceId}
            organizationId={organizationId}
            orgSlug="acme"
            spaceSlug="backend"
            attention={undefined}
            onCreatePackage={vi.fn()}
            onDeleted={vi.fn()}
          />
        </MemoryRouter>
      </UIProvider>,
    );
  });
}

describe('ContextPackagePane', () => {
  beforeEach(() => {
    resetHooks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the version bar under the header', async () => {
    await renderPane(READY_NEVER_RELEASED);

    expect(screen.getByText('Not released yet')).toBeInTheDocument();
  });

  it('hides the version bar from a user outside the flag audience', async () => {
    (useAuthContext as Mock).mockReturnValue({
      user: { email: 'someone@example.com' },
    });

    await renderPane(READY_NEVER_RELEASED);

    expect(screen.queryByText('Not released yet')).not.toBeInTheDocument();
  });

  it('measures the working copy against the last release', async () => {
    await renderPane({
      currentVersion: '1.2.0',
      verdict: 'ready',
      nextVersions: ['1.2.1', '1.3.0', '2.0.0'],
      outdatedComponents: [],
    });

    expect(
      screen.getByText('Unreleased changes since 1.2.0'),
    ).toBeInTheDocument();
  });

  it('offers no release action when the package holds no components', async () => {
    await renderPane({
      currentVersion: null,
      verdict: 'no_components',
      nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
      outdatedComponents: [],
    });

    expect(
      screen.queryByRole('button', { name: /release/i }),
    ).not.toBeInTheDocument();
  });

  it("asks for this package's releases, in this space and organization", async () => {
    await renderPane(READY_NEVER_RELEASED);

    expect(useListPackageReleasesQuery).toHaveBeenCalledWith(
      organizationId,
      spaceId,
      packageId,
    );
  });

  it('still renders the package name above the version bar', async () => {
    await renderPane(READY_NEVER_RELEASED);

    expect(screen.getByText('Backend conventions')).toBeInTheDocument();
  });

  describe('when the address names a release', () => {
    const released: PackageReleaseReadiness = {
      currentVersion: '1.2.0',
      verdict: 'ready',
      nextVersions: ['1.2.1', '1.3.0', '2.0.0'],
      outdatedComponents: [],
    };
    const address = '/?release=1.1.0';
    const releases: PackageReleaseSummary[] = [
      { version: '1.2.0', releasedAt: null },
      { version: '1.1.0', releasedAt: null },
    ];

    beforeEach(() => {
      (useGetPackageReleaseQuery as Mock).mockReturnValue({
        data: {
          release: {
            id: 'release-1',
            packageId,
            version: '1.1.0',
            name: 'Backend conventions',
            description: '',
            recipeVersions: [],
            standardVersions: [
              { id: 'sv-1', standardId: 'std-1', name: 'Naming', version: 2 },
            ],
            skillVersions: [],
          },
        },
        isLoading: false,
        isError: false,
      });
    });

    it('reads that release rather than the working copy', async () => {
      await renderPane(released, { releases, address });

      expect(screen.getByText('Naming')).toBeInTheDocument();
    });

    it('drops the control that writes the working copy', async () => {
      await renderPane(released, { releases, address });

      expect(
        screen.queryByRole('button', { name: /Add components/ }),
      ).not.toBeInTheDocument();
    });

    it('counts the pins of that release on the tab', async () => {
      await renderPane(released, { releases, address });

      expect(
        screen.getByRole('tab', { name: /Components/ }).textContent,
      ).toContain('1');
    });

    it('leaves a reader outside the flag audience on the working copy', async () => {
      (useAuthContext as Mock).mockReturnValue({
        user: { email: 'someone@example.com' },
      });

      await renderPane(released, { releases, address });

      expect(screen.queryByText('Naming')).not.toBeInTheDocument();
    });
  });
});
