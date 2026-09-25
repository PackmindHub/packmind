import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import type { ContextComponent, ContextGroup } from './buildPackageContext';
import type { PackageDrift } from '../redesign/types';
import {
  useDeletePackagesBatchMutation,
  useListPackageDeploymentsQuery,
  useListPackageReleasesQuery,
  useRemoveArtefactsFromPackageMutation,
} from '../../api/queries/DeploymentsQueries';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import { usePackageDestinations } from './usePackageDestinations';
import { usePackageDrift } from './usePackageDrift';
import { useDeleteContextComponents } from './useDeleteContextComponents';
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

vi.mock('./useDeleteContextComponents', () => ({
  useDeleteContextComponents: vi.fn(),
}));

/*
 * The component list under the tab reaches for this on its own, to badge the
 * rows that have changes waiting. Every test below that renders a list would
 * otherwise need a query client for a number none of them read.
 */
vi.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  () => ({
    useGetGroupedChangeProposalsQuery: () => ({ data: undefined }),
  }),
);

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
/**
 * Records what the header asks it to send, which is the one thing about this
 * control the pane decides.
 */
const distributeProps = vi.fn();

vi.mock('../PackageDeployments/DeployPackageButton', () => ({
  DeployPackageButton: (props: {
    packageVersions?: Record<string, string>;
  }) => {
    distributeProps(props.packageVersions);
    return <div data-testid="deploy-button" />;
  },
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
  (useDeleteContextComponents as Mock).mockReturnValue({
    deleteComponents: vi.fn().mockResolvedValue({ deleted: [], failed: [] }),
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

const STANDARD: ContextComponent = {
  key: 'std-1',
  type: 'standard',
  name: 'Naming',
  summary: '',
  version: 1,
  href: '?component=std-1',
  createdAt: null,
};

const SKILL: ContextComponent = {
  key: 'skill-1',
  type: 'skill',
  name: 'Onboarding',
  summary: '',
  version: 1,
  href: '?component=skill-1',
  createdAt: null,
};

/**
 * A package with one destination that has not caught up, which is what makes
 * the header draw its corrective push.
 */
function driftWithOneBehindInstall(): PackageDrift {
  const repo = {
    id: 'repo-1' as PackageDrift['installLocations'][number]['repo']['id'],
    owner: 'acme',
    name: 'common',
    providerId:
      'provider-1' as PackageDrift['installLocations'][number]['repo']['providerId'],
  };
  const target = {
    id: 'target-1' as PackageDrift['installLocations'][number]['target']['id'],
    name: 'root',
    isDefault: true,
  };

  return {
    id: packageId,
    name: 'Backend conventions',
    description: '',
    artifacts: [
      {
        id: 'std-1' as PackageDrift['artifacts'][number]['id'],
        kind: 'standard',
        name: 'Naming',
        packmindVersion: 2,
        isDeleted: false,
        isPending: false,
        installs: [
          {
            repo,
            target,
            branch: 'main',
            deployedVersion: 1,
            lastDeployedAt: '2026-01-01T00:00:00.000Z',
            driftReason: 'behind',
          },
        ],
      },
    ],
    installLocations: [
      {
        repo,
        target,
        branch: 'main',
        lastDistributionStatus: null,
        lastDistributedAt: null,
      },
    ],
  };
}

/** One component, so the header's send control is drawn at all. */
const ONE_GROUP: ContextGroup[] = [
  { type: 'standard', label: 'Standards', components: [STANDARD] },
];

async function renderPane(
  readiness: PackageReleaseReadiness,
  {
    releases = [],
    address = '/',
    groups = [],
  }: {
    releases?: PackageReleaseSummary[];
    /** The address the pane opens at, which is what names the version read. */
    address?: string;
    /** What the package holds, which most of these tests do not care about. */
    groups?: ContextGroup[];
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
            groups={groups}
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

  it('names the reading the pane is on once the package has releases', async () => {
    await renderPane({
      currentVersion: '1.2.0',
      verdict: 'ready',
      nextVersions: ['1.2.1', '1.3.0', '2.0.0'],
      outdatedComponents: [],
    });

    expect(
      screen.getByRole('button', { name: /Unreleased/ }),
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

    it('sends that release when distributing from under it', async () => {
      await renderPane(released, { releases, address, groups: ONE_GROUP });

      expect(distributeProps).toHaveBeenLastCalledWith({
        [packageId]: '1.1.0',
      });
    });

    describe('and a destination is behind', () => {
      beforeEach(() => {
        (usePackageDrift as Mock).mockReturnValue({
          drift: driftWithOneBehindInstall(),
          packages: [],
          isLoading: false,
          isError: false,
        });
      });

      it('drops the push that would send the working copy instead', async () => {
        await renderPane(released, { releases, address, groups: ONE_GROUP });

        expect(
          screen.queryByRole('button', { name: /Update/ }),
        ).not.toBeInTheDocument();
      });

      it('keeps offering it on the working copy', async () => {
        await renderPane(released, { releases, groups: ONE_GROUP });

        expect(
          screen.getByRole('button', { name: /Update 1 distribution/ }),
        ).toBeInTheDocument();
      });
    });

    it('leaves a reader outside the flag audience on the working copy', async () => {
      (useAuthContext as Mock).mockReturnValue({
        user: { email: 'someone@example.com' },
      });

      await renderPane(released, { releases, address });

      expect(screen.queryByText('Naming')).not.toBeInTheDocument();
    });
  });

  /*
   * The gesture the plugin-first navigation took away. The three per-type lists
   * it replaced could delete a selection; inside a package a selection could
   * only be moved or unbundled, and deleting meant opening each component in
   * turn.
   */
  describe('deleting a selection of components', () => {
    const GROUPS: ContextGroup[] = [
      { type: 'standard', label: 'Standards', components: [STANDARD] },
      { type: 'skill', label: 'Skills', components: [SKILL] },
    ];

    async function renderWithSelection(
      deleteComponents = vi
        .fn()
        .mockResolvedValue({ deleted: [STANDARD, SKILL], failed: [] }),
    ) {
      (useDeleteContextComponents as Mock).mockReturnValue({
        deleteComponents,
        isDeleting: false,
      });

      await renderPane(READY_NEVER_RELEASED, { groups: GROUPS });

      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select Naming' }),
      );
      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select Onboarding' }),
      );

      return deleteComponents;
    }

    const openSelectionMenu = () =>
      userEvent.click(
        screen.getByRole('button', { name: 'More actions for the selection' }),
      );

    it('keeps the deletion off the bar, behind the menu', async () => {
      await renderWithSelection();

      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Remove from package' }),
      ).toBeVisible();
    });

    it('asks before deleting anything', async () => {
      const deleteComponents = await renderWithSelection();

      await openSelectionMenu();
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

      expect(deleteComponents).not.toHaveBeenCalled();
    });

    it('names what it is about to delete, counting rather than listing', async () => {
      await renderWithSelection();

      await openSelectionMenu();
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

      expect(screen.getByText(/2 components/, { selector: '*' })).toBeVisible();
    });

    it('deletes the whole selection in one call once confirmed', async () => {
      const deleteComponents = await renderWithSelection();

      await openSelectionMenu();
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(deleteComponents).toHaveBeenCalledTimes(1);
      expect(deleteComponents.mock.calls[0][0]).toEqual([STANDARD, SKILL]);
    });

    describe('when a row is deleted from its own menu', () => {
      it('deletes that one alone', async () => {
        const deleteComponents = vi
          .fn()
          .mockResolvedValue({ deleted: [STANDARD], failed: [] });
        (useDeleteContextComponents as Mock).mockReturnValue({
          deleteComponents,
          isDeleting: false,
        });
        await renderPane(READY_NEVER_RELEASED, { groups: GROUPS });

        await userEvent.click(
          screen.getByRole('button', { name: 'More actions for Naming' }),
        );
        await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

        /*
         * By what names a component rather than by the whole row: a row hands
         * back its component with the href the pane rewrote, so that it opens
         * in this pane rather than on a page of its own.
         */
        expect(deleteComponents.mock.calls[0][0]).toEqual([
          expect.objectContaining({ type: 'standard', key: 'std-1' }),
        ]);
      });
    });

    /*
     * Three endpoints mean a deletion can half succeed. The dialog staying open
     * is what says the part that failed is still there to try again on.
     */
    describe('when part of the selection could not be deleted', () => {
      it('keeps the confirmation open on what is left', async () => {
        await renderWithSelection(
          vi.fn().mockResolvedValue({ deleted: [STANDARD], failed: [SKILL] }),
        );

        await openSelectionMenu();
        await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
      });
    });

    describe('when everything picked is deleted', () => {
      it('closes the confirmation', async () => {
        await renderWithSelection();

        await openSelectionMenu();
        await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
      });
    });
  });
});
