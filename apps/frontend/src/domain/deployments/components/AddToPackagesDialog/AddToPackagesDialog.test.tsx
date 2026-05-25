import React from 'react';
import {
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
} from '@packmind/types';

import { AddToPackagesDialog } from './AddToPackagesDialog';
import {
  AddArtefactsToPackagesOutcome,
  useAddArtefactsToPackagesMutation,
  useListPackagesBySpaceQuery,
} from '../../api/queries/DeploymentsQueries';

jest.mock('../../api/queries/DeploymentsQueries', () => ({
  ...jest.requireActual('../../api/queries/DeploymentsQueries'),
  useAddArtefactsToPackagesMutation: jest.fn(),
  useListPackagesBySpaceQuery: jest.fn(),
}));

const mockUseListPackagesBySpaceQuery =
  useListPackagesBySpaceQuery as jest.MockedFunction<
    typeof useListPackagesBySpaceQuery
  >;
const mockUseAddArtefactsToPackagesMutation =
  useAddArtefactsToPackagesMutation as jest.MockedFunction<
    typeof useAddArtefactsToPackagesMutation
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

const createMockMutation = (
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

const setPackagesResponse = (packages: Package[], isLoading = false) => {
  mockUseListPackagesBySpaceQuery.mockReturnValue({
    data: { packages },
    isLoading,
    isError: false,
  } as unknown as ReturnType<typeof useListPackagesBySpaceQuery>);
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
    artifactIds: [artifactId],
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
    mockUseAddArtefactsToPackagesMutation.mockReturnValue(createMockMutation());
    setPackagesResponse([packageA, packageB]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and artifact-kind subtitle', () => {
    renderDialog({ artifactKindLabel: 'command', artifactType: 'recipe' });

    expect(
      screen.getByRole('heading', { name: 'Add to packages' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Pick the packages this command should also ship in.'),
    ).toBeInTheDocument();
  });

  it('lists every package not yet containing the artifact', () => {
    renderDialog();

    expect(screen.getByText('frontend-rules')).toBeInTheDocument();
    expect(screen.getByText('security-baseline')).toBeInTheDocument();
  });

  it('hides packages that already contain the artifact', () => {
    setPackagesResponse([packageA, packageContainingArtifact]);
    renderDialog();

    expect(screen.queryByText('already-here')).not.toBeInTheDocument();
    expect(screen.getByText('frontend-rules')).toBeInTheDocument();
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
      screen.queryByRole('button', { name: /^Add to/i }),
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

  it('disables the CTA until at least one package is selected', async () => {
    renderDialog();

    expect(
      screen.getByRole('button', { name: /^Add to packages$/i }),
    ).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Add to frontend-rules'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^Add to 1 package$/i }),
      ).not.toBeDisabled();
    });
  });

  it('filters the list when the user types in the search field', async () => {
    renderDialog();

    const search = screen.getByPlaceholderText('Search packages...');
    fireEvent.change(search, { target: { value: 'security' } });

    await waitFor(() => {
      expect(screen.queryByText('frontend-rules')).not.toBeInTheDocument();
    });
    expect(screen.getByText('security-baseline')).toBeInTheDocument();
  });

  it('shows the no-match state with a Clear search action', async () => {
    renderDialog();

    fireEvent.change(screen.getByPlaceholderText('Search packages...'), {
      target: { value: 'nothing-matches' },
    });

    expect(
      await screen.findByText('No packages match "nothing-matches".'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear search'));

    await waitFor(() => {
      expect(screen.getByText('frontend-rules')).toBeInTheDocument();
    });
  });

  it('submits a per-package entry for each selected package', async () => {
    const mutateAsync = jest.fn().mockResolvedValue([
      { packageId: packageA.id, ok: true, response: { package: packageA } },
      { packageId: packageB.id, ok: true, response: { package: packageB } },
    ] as AddArtefactsToPackagesOutcome[]);
    mockUseAddArtefactsToPackagesMutation.mockReturnValue(
      createMockMutation({ mutateAsync }),
    );

    const { props } = renderDialog();

    fireEvent.click(screen.getByLabelText('Add to frontend-rules'));
    fireEvent.click(screen.getByLabelText('Add to security-baseline'));

    const submit = await screen.findByRole('button', {
      name: /^Add to 2 packages$/i,
    });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        spaceId,
        entries: [
          { packageId: packageA.id, standardIds: [artifactId] },
          { packageId: packageB.id, standardIds: [artifactId] },
        ],
      });
    });

    await waitFor(() => {
      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('keeps the dialog open when every package call fails', async () => {
    const failure = new Error('boom');
    const mutateAsync = jest
      .fn()
      .mockResolvedValue([
        { packageId: packageA.id, ok: false, error: failure },
      ] as AddArtefactsToPackagesOutcome[]);
    mockUseAddArtefactsToPackagesMutation.mockReturnValue(
      createMockMutation({ mutateAsync }),
    );

    const { props } = renderDialog();

    fireEvent.click(screen.getByLabelText('Add to frontend-rules'));
    fireEvent.click(
      await screen.findByRole('button', { name: /^Add to 1 package$/i }),
    );

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('invokes onSuccess after a full-success submission', async () => {
    const mutateAsync = jest.fn().mockResolvedValue([
      { packageId: packageA.id, ok: true, response: { package: packageA } },
      { packageId: packageB.id, ok: true, response: { package: packageB } },
    ] as AddArtefactsToPackagesOutcome[]);
    mockUseAddArtefactsToPackagesMutation.mockReturnValue(
      createMockMutation({ mutateAsync }),
    );
    const onSuccess = jest.fn();

    renderDialog({ onSuccess });

    fireEvent.click(screen.getByLabelText('Add to frontend-rules'));
    fireEvent.click(screen.getByLabelText('Add to security-baseline'));
    fireEvent.click(
      await screen.findByRole('button', { name: /^Add to 2 packages$/i }),
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('does not invoke onSuccess when every package call fails', async () => {
    const failure = new Error('boom');
    const mutateAsync = jest
      .fn()
      .mockResolvedValue([
        { packageId: packageA.id, ok: false, error: failure },
      ] as AddArtefactsToPackagesOutcome[]);
    mockUseAddArtefactsToPackagesMutation.mockReturnValue(
      createMockMutation({ mutateAsync }),
    );
    const onSuccess = jest.fn();

    renderDialog({ onSuccess });

    fireEvent.click(screen.getByLabelText('Add to frontend-rules'));
    fireEvent.click(
      await screen.findByRole('button', { name: /^Add to 1 package$/i }),
    );

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not invoke onSuccess on partial success', async () => {
    const failure = new Error('boom');
    const mutateAsync = jest.fn().mockResolvedValue([
      { packageId: packageA.id, ok: true, response: { package: packageA } },
      { packageId: packageB.id, ok: false, error: failure },
    ] as AddArtefactsToPackagesOutcome[]);
    mockUseAddArtefactsToPackagesMutation.mockReturnValue(
      createMockMutation({ mutateAsync }),
    );
    const onSuccess = jest.fn();

    renderDialog({ onSuccess });

    fireEvent.click(screen.getByLabelText('Add to frontend-rules'));
    fireEvent.click(screen.getByLabelText('Add to security-baseline'));
    fireEvent.click(
      await screen.findByRole('button', { name: /^Add to 2 packages$/i }),
    );

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  describe('multi-artifact selection', () => {
    const firstId = createStandardId('multi-1');
    const secondId = createStandardId('multi-2');
    const thirdId = createStandardId('multi-3');
    const multiArtifactIds = [firstId, secondId, thirdId];

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
      renderDialog({ artifactIds: multiArtifactIds });

      expect(
        screen.getByText(
          'Pick the packages these 3 standards should also ship in.',
        ),
      ).toBeInTheDocument();
    });

    it('renders an "already includes N of M" hint on packages with partial overlap', () => {
      setPackagesResponse([packageWithPartialOverlap, packageWithNoOverlap]);
      renderDialog({ artifactIds: multiArtifactIds });

      const partialRow = screen
        .getByText('partial-overlap')
        .closest('[role="listitem"]');
      expect(partialRow).not.toBeNull();
      if (partialRow) {
        expect(
          within(partialRow as HTMLElement).getByText(
            'Already includes 1 of 3',
          ),
        ).toBeInTheDocument();
      }

      const freshRow = screen
        .getByText('fresh-target')
        .closest('[role="listitem"]');
      expect(freshRow).not.toBeNull();
      if (freshRow) {
        expect(
          within(freshRow as HTMLElement).queryByText(/Already includes/),
        ).not.toBeInTheDocument();
      }
    });

    it('omits already-present artifact IDs from each per-package entry at submit', async () => {
      setPackagesResponse([packageWithPartialOverlap, packageWithNoOverlap]);
      const mutateAsync = jest.fn().mockResolvedValue([
        {
          packageId: packageWithPartialOverlap.id,
          ok: true,
          response: { package: packageWithPartialOverlap },
        },
        {
          packageId: packageWithNoOverlap.id,
          ok: true,
          response: { package: packageWithNoOverlap },
        },
      ] as AddArtefactsToPackagesOutcome[]);
      mockUseAddArtefactsToPackagesMutation.mockReturnValue(
        createMockMutation({ mutateAsync }),
      );

      renderDialog({ artifactIds: multiArtifactIds });

      fireEvent.click(screen.getByLabelText('Add to partial-overlap'));
      fireEvent.click(screen.getByLabelText('Add to fresh-target'));

      fireEvent.click(
        await screen.findByRole('button', {
          name: /^Add 3 standards to 2 packages$/i,
        }),
      );

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          entries: [
            {
              packageId: packageWithPartialOverlap.id,
              standardIds: [secondId, thirdId],
            },
            {
              packageId: packageWithNoOverlap.id,
              standardIds: [firstId, secondId, thirdId],
            },
          ],
        });
      });
    });

    it('shows the plural all-covered message when every package already has every selected artifact', () => {
      setPackagesResponse([packageWithAllArtifacts]);
      renderDialog({ artifactIds: multiArtifactIds });

      expect(
        screen.getByText(
          'These 3 standards are already in every package in this space.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^Add to/i }),
      ).not.toBeInTheDocument();
    });

    it('switches the submit button copy when more than one artifact is selected', async () => {
      setPackagesResponse([packageWithNoOverlap]);
      renderDialog({ artifactIds: multiArtifactIds });

      expect(
        screen.getByRole('button', { name: /^Add to packages$/i }),
      ).toBeDisabled();

      fireEvent.click(screen.getByLabelText('Add to fresh-target'));

      await waitFor(() => {
        expect(
          screen.getByRole('button', {
            name: /^Add 3 standards to 1 package$/i,
          }),
        ).not.toBeDisabled();
      });
    });
  });
});
