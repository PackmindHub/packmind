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
import type { PackageReleaseReadiness, PackageResponse } from '@packmind/types';
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
}

async function renderPane(readiness: PackageReleaseReadiness) {
  (useListPackageReleasesQuery as Mock).mockReturnValue({
    data: {
      releases: readiness.currentVersion
        ? [{ version: readiness.currentVersion }]
        : [],
      readiness,
    },
    isLoading: false,
  });

  await act(async () => {
    render(
      <UIProvider>
        <MemoryRouter>
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

  it('renders the version area in the header', async () => {
    await renderPane(READY_NEVER_RELEASED);

    expect(screen.getByText('Not released yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create a release/i }),
    ).toBeEnabled();
  });

  it('shows the current version once the package has been released', async () => {
    await renderPane({
      currentVersion: '1.2.0',
      verdict: 'ready',
      nextVersions: ['1.2.1', '1.3.0', '2.0.0'],
      outdatedComponents: [],
    });

    expect(screen.getByText('1.2.0')).toBeInTheDocument();
  });

  it('disables the release action when the package holds no components', async () => {
    await renderPane({
      currentVersion: null,
      verdict: 'no_components',
      nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
      outdatedComponents: [],
    });

    expect(
      screen.getByRole('button', { name: /create a release/i }),
    ).toBeDisabled();
  });

  it("asks for this package's releases, in this space and organization", async () => {
    await renderPane(READY_NEVER_RELEASED);

    expect(useListPackageReleasesQuery).toHaveBeenCalledWith(
      organizationId,
      spaceId,
      packageId,
    );
  });

  it('still renders the package name beside the version area', async () => {
    await renderPane(READY_NEVER_RELEASED);

    expect(screen.getByText('Backend conventions')).toBeInTheDocument();
  });
});
