import React from 'react';
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createStandardId,
  Package,
  PackageId,
} from '@packmind/types';

import { AddToPackagesDialog } from './AddToPackagesDialog';
import {
  AddArtefactsToPackagesOutcome,
  useAddArtefactsToPackagesMutation,
  useRemoveArtefactsFromPackageMutation,
  useListActiveDistributedPackagesBySpaceQuery,
  useListPackagesBySpaceQuery,
} from '../../api/queries/DeploymentsQueries';
import { usePackageMarketplaceStatus } from '@packmind/proprietary/frontend/domain/marketplaces/hooks/usePackageMarketplaceStatus';

jest.mock('../../api/queries/DeploymentsQueries', () => ({
  ...jest.requireActual('../../api/queries/DeploymentsQueries'),
  useAddArtefactsToPackagesMutation: jest.fn(),
  useRemoveArtefactsFromPackageMutation: jest.fn(),
  useListPackagesBySpaceQuery: jest.fn(),
  useListActiveDistributedPackagesBySpaceQuery: jest.fn(),
}));
jest.mock(
  '@packmind/proprietary/frontend/domain/marketplaces/hooks/usePackageMarketplaceStatus',
  () => ({
    usePackageMarketplaceStatus: jest.fn(),
  }),
);

const mockUseListPackagesBySpaceQuery =
  useListPackagesBySpaceQuery as jest.MockedFunction<
    typeof useListPackagesBySpaceQuery
  >;
const mockUseAddArtefactsToPackagesMutation =
  useAddArtefactsToPackagesMutation as jest.MockedFunction<
    typeof useAddArtefactsToPackagesMutation
  >;
const mockUseRemoveArtefactsFromPackageMutation =
  useRemoveArtefactsFromPackageMutation as jest.MockedFunction<
    typeof useRemoveArtefactsFromPackageMutation
  >;
const mockUseListActiveDistributedPackagesBySpaceQuery =
  useListActiveDistributedPackagesBySpaceQuery as jest.MockedFunction<
    typeof useListActiveDistributedPackagesBySpaceQuery
  >;
const mockUsePackageMarketplaceStatus =
  usePackageMarketplaceStatus as jest.MockedFunction<
    typeof usePackageMarketplaceStatus
  >;

const artifactId = createStandardId('std-1');
const otherStandardId = createStandardId('std-other');
const organizationId = createOrganizationId('org-1');
const spaceId = createSpaceId('space-1');

const packageA: Package = {
  id: createPackageId('pkg-a'),
  name: 'frontend-rules',
  slug: 'frontend-rules',
  description: 'Rules for the frontend.',
  spaceId,
  createdBy: 'user-1' as Package['createdBy'],
  recipes: [],
  standards: [otherStandardId],
  skills: [],
};
const packageB: Package = {
  id: createPackageId('pkg-b'),
  name: 'security-baseline',
  slug: 'security-baseline',
  description: '',
  spaceId,
  createdBy: 'user-1' as Package['createdBy'],
  recipes: [],
  standards: [],
  skills: [],
};
const packageContainingArtifact: Package = {
  id: createPackageId('pkg-c'),
  name: 'already-here',
  slug: 'already-here',
  description: '',
  spaceId,
  createdBy: 'user-1' as Package['createdBy'],
  recipes: [],
  standards: [artifactId],
  skills: [],
};

const createMockAddMutation = (
  overrides: Partial<ReturnType<typeof useAddArtefactsToPackagesMutation>> = {},
) =>
  ({
    mutate: jest.fn(),
    mutateAsync: jest
      .fn()
      .mockResolvedValue([] as AddArtefactsToPackagesOutcome[]),
    isPending: false,
    isSuccess: false,
    isError: false,
    reset: jest.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof useAddArtefactsToPackagesMutation>;

const createMockRemoveMutation = (
  overrides: Partial<
    ReturnType<typeof useRemoveArtefactsFromPackageMutation>
  > = {},
) =>
  ({
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
    isSuccess: false,
    isError: false,
    reset: jest.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof useRemoveArtefactsFromPackageMutation>;

const setPackagesResponse = (packages: Package[], isLoading = false) => {
  mockUseListPackagesBySpaceQuery.mockReturnValue({
    data: { packages },
    isLoading,
    isError: false,
  } as unknown as ReturnType<typeof useListPackagesBySpaceQuery>);
};

const setPublishedMarketplaces = (counts: Record<string, number>) => {
  mockUsePackageMarketplaceStatus.mockReturnValue({
    getPublishedMarketplaces: (packageId) =>
      packageId ? (counts[packageId.toString()] ?? 0) : 0,
    isLoading: false,
    isError: false,
  });
};

const setDeployedPackages = (packageIds: PackageId[], targetCount = 1) => {
  const targets = Array.from({ length: targetCount }, (_, index) => ({
    targetId: `target-${index + 1}`,
    packages: packageIds.map((packageId) => ({ packageId })),
  }));
  mockUseListActiveDistributedPackagesBySpaceQuery.mockReturnValue({
    data: targets,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<
    typeof useListActiveDistributedPackagesBySpaceQuery
  >);
};

const renderDialog = (
  overrides: Partial<React.ComponentProps<typeof AddToPackagesDialog>> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const props: React.ComponentProps<typeof AddToPackagesDialog> = {
    open: true,
    onOpenChange: jest.fn(),
    artifacts: [{ id: artifactId, name: 'My Standard' }],
    artifactType: 'standard',
    artifactKindLabel: 'standard',
    organizationId,
    spaceId,
    orgSlug: 'acme',
    spaceSlug: 'main',
    onSuccess: jest.fn(),
    ...overrides,
  };
  return {
    ...render(
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AddToPackagesDialog {...props} />
          </MemoryRouter>
        </QueryClientProvider>
      </UIProvider>,
    ),
    props,
  };
};

describe('AddToPackagesDialog', () => {
  beforeEach(() => {
    mockUseAddArtefactsToPackagesMutation.mockReturnValue(
      createMockAddMutation(),
    );
    mockUseRemoveArtefactsFromPackageMutation.mockReturnValue(
      createMockRemoveMutation(),
    );
    setDeployedPackages([]);
    setPublishedMarketplaces({});
    setPackagesResponse([packageA, packageB]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and artifact-kind subtitle', () => {
    renderDialog({ artifactKindLabel: 'command', artifactType: 'recipe' });

    expect(
      screen.getByRole('heading', { name: 'Manage packages' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Which packages ship this command.'),
    ).toBeInTheDocument();
  });

  it('lists packages missing the artifact in the add section', () => {
    renderDialog();

    expect(screen.getByLabelText('Add to frontend-rules')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Add to security-baseline'),
    ).toBeInTheDocument();
  });

  it('lists packages already containing the artifact in the members section', () => {
    setPackagesResponse([packageA, packageContainingArtifact]);
    renderDialog();

    expect(
      screen.getByLabelText('Remove from already-here'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Add to already-here'),
    ).not.toBeInTheDocument();
  });

  it('shows the not-in-any-package hint when nothing contains the artifact', () => {
    renderDialog();

    expect(
      screen.getByText('Not in any package yet. Pick one below to add it.'),
    ).toBeInTheDocument();
  });

  it('shows the all-covered message when every package already contains it', () => {
    setPackagesResponse([packageContainingArtifact]);
    renderDialog();

    expect(
      screen.getByText(
        'This standard is already in every package in this space.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Search packages...'),
    ).not.toBeInTheDocument();
  });

  it('shows the empty-space message when the space has no packages', () => {
    setPackagesResponse([]);
    renderDialog();

    expect(
      screen.getByText('No packages in this space yet.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute(
      'href',
      '/org/acme/space/main/packages/new',
    );
  });

  it('filters the add section when the user types in the search field', async () => {
    renderDialog();

    const search = screen.getByPlaceholderText('Search packages...');
    fireEvent.change(search, { target: { value: 'security' } });

    await waitFor(() => {
      expect(
        screen.queryByLabelText('Add to frontend-rules'),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByLabelText('Add to security-baseline'),
    ).toBeInTheDocument();
  });

  it('shows the no-match state with a Clear search action', async () => {
    renderDialog();

    fireEvent.change(screen.getByPlaceholderText('Search packages...'), {
      target: { value: 'nothing-matches' },
    });

    expect(
      await screen.findByText('No package matches "nothing-matches".'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear search'));

    await waitFor(() => {
      expect(
        screen.getByLabelText('Add to frontend-rules'),
      ).toBeInTheDocument();
    });
  });

  describe('instant add', () => {
    it('submits a single-package entry when an add row is clicked', async () => {
      const mutateAsync = jest
        .fn()
        .mockResolvedValue([
          { packageId: packageA.id, ok: true, response: { package: packageA } },
        ] as AddArtefactsToPackagesOutcome[]);
      mockUseAddArtefactsToPackagesMutation.mockReturnValue(
        createMockAddMutation({ mutateAsync }),
      );

      renderDialog();

      fireEvent.click(screen.getByLabelText('Add to frontend-rules'));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          entries: [{ packageId: packageA.id, standardIds: [artifactId] }],
        });
      });
    });

    it('keeps the drawer open after a successful add', async () => {
      const mutateAsync = jest
        .fn()
        .mockResolvedValue([
          { packageId: packageA.id, ok: true, response: { package: packageA } },
        ] as AddArtefactsToPackagesOutcome[]);
      mockUseAddArtefactsToPackagesMutation.mockReturnValue(
        createMockAddMutation({ mutateAsync }),
      );

      const { props } = renderDialog();

      fireEvent.click(screen.getByLabelText('Add to frontend-rules'));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalled();
      });
      expect(props.onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  it('shows split repo and marketplace counts on a member row', () => {
    setPackagesResponse([packageContainingArtifact, packageA]);
    setDeployedPackages([packageContainingArtifact.id], 2);
    setPublishedMarketplaces({ [packageContainingArtifact.id.toString()]: 1 });

    renderDialog();

    expect(screen.getByText('2 repos · 1 marketplace')).toBeInTheDocument();
  });

  describe('remove from the members section', () => {
    it('removes instantly when the package is not deployed', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({});
      mockUseRemoveArtefactsFromPackageMutation.mockReturnValue(
        createMockRemoveMutation({ mutateAsync }),
      );
      setPackagesResponse([packageContainingArtifact, packageA]);

      renderDialog();

      fireEvent.click(screen.getByLabelText('Remove from already-here'));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          packageId: packageContainingArtifact.id,
          standardIds: [artifactId],
        });
      });
      expect(
        screen.queryByText('Remove from already-here?'),
      ).not.toBeInTheDocument();
    });

    it('asks for confirmation when the package is deployed', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({});
      mockUseRemoveArtefactsFromPackageMutation.mockReturnValue(
        createMockRemoveMutation({ mutateAsync }),
      );
      setPackagesResponse([packageContainingArtifact, packageA]);
      setDeployedPackages([packageContainingArtifact.id], 2);

      renderDialog();

      fireEvent.click(screen.getByLabelText('Remove from already-here'));

      expect(
        await screen.findByText('Remove from already-here?'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/already-here is deployed to 2 repos/),
      ).toBeInTheDocument();
      expect(mutateAsync).not.toHaveBeenCalled();

      // Text query on purpose: zag marks sibling layers aria-hidden on an
      // async tick in jsdom, which makes role queries on the nested dialog
      // timing-dependent. The e2e suite covers the accessibility tree.
      fireEvent.click(
        await screen.findByText('Remove', { selector: 'button' }),
      );

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          packageId: packageContainingArtifact.id,
          standardIds: [artifactId],
        });
      });
    });

    it('asks for confirmation when the package is only published to a marketplace', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({});
      mockUseRemoveArtefactsFromPackageMutation.mockReturnValue(
        createMockRemoveMutation({ mutateAsync }),
      );
      setPackagesResponse([packageContainingArtifact, packageA]);
      setPublishedMarketplaces({
        [packageContainingArtifact.id.toString()]: 1,
      });

      renderDialog();

      fireEvent.click(screen.getByLabelText('Remove from already-here'));

      expect(
        await screen.findByText('Remove from already-here?'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/already-here is deployed to 1 marketplace/),
      ).toBeInTheDocument();
      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('names both repos and marketplaces in the confirmation banner', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({});
      mockUseRemoveArtefactsFromPackageMutation.mockReturnValue(
        createMockRemoveMutation({ mutateAsync }),
      );
      setPackagesResponse([packageContainingArtifact, packageA]);
      setDeployedPackages([packageContainingArtifact.id], 2);
      setPublishedMarketplaces({
        [packageContainingArtifact.id.toString()]: 1,
      });

      renderDialog();

      fireEvent.click(screen.getByLabelText('Remove from already-here'));

      expect(
        await screen.findByText(
          /already-here is deployed to 2 repos and 1 marketplace/,
        ),
      ).toBeInTheDocument();
      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('close behavior', () => {
    it('invokes onSuccess on close after a successful change', async () => {
      const mutateAsync = jest
        .fn()
        .mockResolvedValue([
          { packageId: packageA.id, ok: true, response: { package: packageA } },
        ] as AddArtefactsToPackagesOutcome[]);
      mockUseAddArtefactsToPackagesMutation.mockReturnValue(
        createMockAddMutation({ mutateAsync }),
      );
      const onSuccess = jest.fn();

      renderDialog({ onSuccess });

      // act flushes the whole add flow, including the state commit that
      // marks the drawer as changed, before Done is clicked.
      await act(async () => {
        fireEvent.click(screen.getByLabelText('Add to frontend-rules'));
      });
      expect(mutateAsync).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Done' }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('does not invoke onSuccess on close when nothing changed', async () => {
      const onSuccess = jest.fn();

      const { props } = renderDialog({ onSuccess });

      fireEvent.click(screen.getByRole('button', { name: 'Done' }));

      await waitFor(() => {
        expect(props.onOpenChange).toHaveBeenCalledWith(false);
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('does not invoke onSuccess when the only add attempt failed', async () => {
      const failure = new Error('boom');
      const mutateAsync = jest
        .fn()
        .mockResolvedValue([
          { packageId: packageA.id, ok: false, error: failure },
        ] as AddArtefactsToPackagesOutcome[]);
      mockUseAddArtefactsToPackagesMutation.mockReturnValue(
        createMockAddMutation({ mutateAsync }),
      );
      const onSuccess = jest.fn();

      renderDialog({ onSuccess });

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Add to frontend-rules'));
      });
      expect(mutateAsync).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Done' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('multi-artifact selection', () => {
    const firstId = createStandardId('multi-1');
    const secondId = createStandardId('multi-2');
    const thirdId = createStandardId('multi-3');
    const multiArtifacts = [
      { id: firstId, name: 'First Standard' },
      { id: secondId, name: 'Second Standard' },
      { id: thirdId, name: 'Third Standard' },
    ];

    const packageWithPartialOverlap: Package = {
      id: createPackageId('pkg-partial'),
      name: 'partial-overlap',
      slug: 'partial-overlap',
      description: 'Has one of three.',
      spaceId,
      createdBy: 'user-1' as Package['createdBy'],
      recipes: [],
      standards: [firstId],
      skills: [],
    };
    const packageWithNoOverlap: Package = {
      id: createPackageId('pkg-fresh'),
      name: 'fresh-target',
      slug: 'fresh-target',
      description: 'Has none of them.',
      spaceId,
      createdBy: 'user-1' as Package['createdBy'],
      recipes: [],
      standards: [],
      skills: [],
    };
    const packageWithAllArtifacts: Package = {
      id: createPackageId('pkg-full'),
      name: 'fully-covered',
      slug: 'fully-covered',
      description: '',
      spaceId,
      createdBy: 'user-1' as Package['createdBy'],
      recipes: [],
      standards: [firstId, secondId, thirdId],
      skills: [],
    };

    it('renders a plural subtitle that names the artifact count and kind', () => {
      setPackagesResponse([packageWithNoOverlap]);
      renderDialog({ artifacts: multiArtifacts });

      expect(
        screen.getByText('Which packages ship these 3 standards.'),
      ).toBeInTheDocument();
    });

    it('treats a package containing every selected artifact as a member', () => {
      setPackagesResponse([packageWithAllArtifacts, packageWithNoOverlap]);
      renderDialog({ artifacts: multiArtifacts });

      expect(
        screen.getByLabelText('Remove from fully-covered'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Add to fresh-target')).toBeInTheDocument();
    });

    it('shows the plural members-empty hint when no package holds any of them', () => {
      setPackagesResponse([packageWithNoOverlap]);
      renderDialog({ artifacts: multiArtifacts });

      expect(
        screen.getByText(
          'None of these 3 standards are in a package yet. Pick one below to add them.',
        ),
      ).toBeInTheDocument();
    });

    it('lists a partial-overlap package in both sections with a contains hint', () => {
      setPackagesResponse([packageWithPartialOverlap, packageWithNoOverlap]);
      renderDialog({ artifacts: multiArtifacts });

      const memberRow = screen
        .getByLabelText('Remove from partial-overlap')
        .closest('div');
      expect(memberRow).not.toBeNull();
      expect(
        within(memberRow as HTMLElement).getByText('contains 1 of 3'),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Add to partial-overlap'),
      ).toBeInTheDocument();

      expect(
        screen.queryByLabelText('Remove from fresh-target'),
      ).not.toBeInTheDocument();
    });

    it('names the missing artifacts in a tooltip on the adds hint', async () => {
      setPackagesResponse([packageWithPartialOverlap, packageWithNoOverlap]);
      renderDialog({ artifacts: multiArtifacts });

      const hint = screen.getByText('adds 2 of 3');
      fireEvent.pointerMove(hint, { pointerType: 'mouse' });

      expect(
        await screen.findByText(
          'Second Standard, Third Standard',
          {},
          { timeout: 2000 },
        ),
      ).toBeInTheDocument();
    });

    it('names the held artifacts in a tooltip on the contains hint', async () => {
      setPackagesResponse([packageWithPartialOverlap, packageWithNoOverlap]);
      renderDialog({ artifacts: multiArtifacts });

      const hint = screen.getByText('contains 1 of 3');
      fireEvent.pointerMove(hint, { pointerType: 'mouse' });

      expect(
        await screen.findByText('First Standard', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
    });

    it('removes only the artifacts the package holds from a partial overlap', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({});
      mockUseRemoveArtefactsFromPackageMutation.mockReturnValue(
        createMockRemoveMutation({ mutateAsync }),
      );
      setPackagesResponse([packageWithPartialOverlap, packageWithNoOverlap]);

      renderDialog({ artifacts: multiArtifacts });

      fireEvent.click(screen.getByLabelText('Remove from partial-overlap'));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          packageId: packageWithPartialOverlap.id,
          standardIds: [firstId],
        });
      });
    });

    it('confirms with only the held artifact names when the partial overlap is deployed', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({});
      mockUseRemoveArtefactsFromPackageMutation.mockReturnValue(
        createMockRemoveMutation({ mutateAsync }),
      );
      setPackagesResponse([packageWithPartialOverlap, packageWithNoOverlap]);
      setDeployedPackages([packageWithPartialOverlap.id]);

      renderDialog({ artifacts: multiArtifacts });

      fireEvent.click(screen.getByLabelText('Remove from partial-overlap'));

      expect(
        await screen.findByText('Remove from partial-overlap?'),
      ).toBeInTheDocument();
      expect(screen.getByText('First Standard')).toBeInTheDocument();
      expect(screen.queryByText('Second Standard')).not.toBeInTheDocument();
      expect(mutateAsync).not.toHaveBeenCalled();

      fireEvent.click(
        await screen.findByText('Remove', { selector: 'button' }),
      );

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          packageId: packageWithPartialOverlap.id,
          standardIds: [firstId],
        });
      });
    });

    it('renders an "adds N of M" hint on packages with partial overlap', () => {
      setPackagesResponse([packageWithPartialOverlap, packageWithNoOverlap]);
      renderDialog({ artifacts: multiArtifacts });

      const partialRow = screen.getByLabelText('Add to partial-overlap');
      expect(within(partialRow).getByText('adds 2 of 3')).toBeInTheDocument();

      const freshRow = screen.getByLabelText('Add to fresh-target');
      expect(
        within(freshRow).queryByText(/adds \d+ of/),
      ).not.toBeInTheDocument();
    });

    it('omits already-present artifact IDs from the entry when adding', async () => {
      setPackagesResponse([packageWithPartialOverlap, packageWithNoOverlap]);
      const mutateAsync = jest.fn().mockResolvedValue([
        {
          packageId: packageWithPartialOverlap.id,
          ok: true,
          response: { package: packageWithPartialOverlap },
        },
      ] as AddArtefactsToPackagesOutcome[]);
      mockUseAddArtefactsToPackagesMutation.mockReturnValue(
        createMockAddMutation({ mutateAsync }),
      );

      renderDialog({ artifacts: multiArtifacts });

      fireEvent.click(screen.getByLabelText('Add to partial-overlap'));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          entries: [
            {
              packageId: packageWithPartialOverlap.id,
              standardIds: [secondId, thirdId],
            },
          ],
        });
      });
    });

    it('removes several artifacts instantly when the package is not deployed', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({});
      mockUseRemoveArtefactsFromPackageMutation.mockReturnValue(
        createMockRemoveMutation({ mutateAsync }),
      );
      setPackagesResponse([packageWithAllArtifacts, packageWithNoOverlap]);

      renderDialog({ artifacts: multiArtifacts });

      fireEvent.click(screen.getByLabelText('Remove from fully-covered'));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          packageId: packageWithAllArtifacts.id,
          standardIds: [firstId, secondId, thirdId],
        });
      });
      expect(
        screen.queryByText('Remove 3 artifacts from fully-covered?'),
      ).not.toBeInTheDocument();
    });

    it('asks for confirmation before a bulk remove from a deployed package', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({});
      mockUseRemoveArtefactsFromPackageMutation.mockReturnValue(
        createMockRemoveMutation({ mutateAsync }),
      );
      setPackagesResponse([packageWithAllArtifacts, packageWithNoOverlap]);
      setDeployedPackages([packageWithAllArtifacts.id]);

      renderDialog({ artifacts: multiArtifacts });

      fireEvent.click(screen.getByLabelText('Remove from fully-covered'));

      expect(
        await screen.findByText('Remove 3 artifacts from fully-covered?'),
      ).toBeInTheDocument();
      expect(screen.getByText('First Standard')).toBeInTheDocument();
      expect(screen.getByText('Second Standard')).toBeInTheDocument();
      expect(screen.getByText('Third Standard')).toBeInTheDocument();
      expect(mutateAsync).not.toHaveBeenCalled();

      fireEvent.click(
        await screen.findByText('Remove 3', { selector: 'button' }),
      );

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          packageId: packageWithAllArtifacts.id,
          standardIds: [firstId, secondId, thirdId],
        });
      });
    });

    it('shows the plural all-covered message when every package already has every selected artifact', () => {
      setPackagesResponse([packageWithAllArtifacts]);
      renderDialog({ artifacts: multiArtifacts });

      expect(
        screen.getByText(
          'These 3 standards are already in every package in this space.',
        ),
      ).toBeInTheDocument();
    });
  });
});
