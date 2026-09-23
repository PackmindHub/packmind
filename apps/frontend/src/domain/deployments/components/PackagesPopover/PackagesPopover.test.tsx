import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  Package,
  PackageId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createStandardId,
} from '@packmind/types';
import type { MockedFunction } from 'vitest';

import { PackagesPopover } from './PackagesPopover';
import {
  useListActiveDistributedPackagesBySpaceQuery,
  useListPackagesBySpaceQuery,
  useMoveArtefactsToPackageMutation,
  useRemoveArtefactsFromPackageMutation,
} from '../../api/queries/DeploymentsQueries';
import { usePackageMarketplaceStatus } from '@packmind/proprietary/frontend/domain/marketplaces/hooks/usePackageMarketplaceStatus';

vi.mock('../../api/queries/DeploymentsQueries', async () => ({
  ...(await vi.importActual('../../api/queries/DeploymentsQueries')),
  useMoveArtefactsToPackageMutation: vi.fn(),
  useRemoveArtefactsFromPackageMutation: vi.fn(),
  useListPackagesBySpaceQuery: vi.fn(),
  useListActiveDistributedPackagesBySpaceQuery: vi.fn(),
}));
vi.mock(
  '@packmind/proprietary/frontend/domain/marketplaces/hooks/usePackageMarketplaceStatus',
  () => ({ usePackageMarketplaceStatus: vi.fn() }),
);

const mockUseListPackagesBySpaceQuery =
  useListPackagesBySpaceQuery as MockedFunction<
    typeof useListPackagesBySpaceQuery
  >;
const mockUseMoveArtefactsToPackageMutation =
  useMoveArtefactsToPackageMutation as MockedFunction<
    typeof useMoveArtefactsToPackageMutation
  >;
const mockUseRemoveArtefactsFromPackageMutation =
  useRemoveArtefactsFromPackageMutation as MockedFunction<
    typeof useRemoveArtefactsFromPackageMutation
  >;
const mockUseListActiveDistributedPackagesBySpaceQuery =
  useListActiveDistributedPackagesBySpaceQuery as MockedFunction<
    typeof useListActiveDistributedPackagesBySpaceQuery
  >;
const mockUsePackageMarketplaceStatus =
  usePackageMarketplaceStatus as MockedFunction<
    typeof usePackageMarketplaceStatus
  >;

const artifactId = createStandardId('std-1');
const organizationId = createOrganizationId('org-1');
const spaceId = createSpaceId('space-1');

const buildPackage = (id: string, name: string, standards: string[] = []) =>
  ({
    id: createPackageId(id),
    name,
    slug: name,
    description: '',
    spaceId,
    createdBy: 'user-1',
    recipes: [],
    commands: [],
    standards,
    skills: [],
  }) as unknown as Package;

const holder = buildPackage('pkg-holder', 'already-here', [artifactId]);
const destination = buildPackage('pkg-dest', 'frontend-rules');

const createMockMoveMutation = (
  overrides: Partial<ReturnType<typeof useMoveArtefactsToPackageMutation>> = {},
) =>
  ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    reset: vi.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof useMoveArtefactsToPackageMutation>;

const setPackages = (packages: Package[]) => {
  mockUseListPackagesBySpaceQuery.mockReturnValue({
    data: { packages },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useListPackagesBySpaceQuery>);
};

const setDeployedPackages = (packageIds: PackageId[]) => {
  mockUseListActiveDistributedPackagesBySpaceQuery.mockReturnValue({
    data: [
      {
        targetId: 'target-1',
        packages: packageIds.map((packageId) => ({ packageId })),
      },
    ],
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<
    typeof useListActiveDistributedPackagesBySpaceQuery
  >);
};

const renderPopover = () =>
  render(
    <UIProvider>
      <MemoryRouter>
        <PackagesPopover
          artifactId={artifactId}
          artifactType="standard"
          artifactKindLabel="standard"
          artifactName="My Standard"
          spaceId={spaceId}
          organizationId={organizationId}
        />
      </MemoryRouter>
    </UIProvider>,
  );

const openPopover = () =>
  fireEvent.click(screen.getByTestId('packages-popover-trigger'));

describe('PackagesPopover', () => {
  beforeEach(() => {
    mockUseMoveArtefactsToPackageMutation.mockReturnValue(
      createMockMoveMutation(),
    );
    mockUseRemoveArtefactsFromPackageMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as unknown as ReturnType<typeof useRemoveArtefactsFromPackageMutation>);
    mockUsePackageMarketplaceStatus.mockReturnValue({
      getPublishedMarketplaces: () => 0,
      isLoading: false,
      isError: false,
    });
    setDeployedPackages([]);
    setPackages([holder, destination]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('offers the other packages as move destinations', () => {
    renderPopover();
    openPopover();

    expect(screen.getByLabelText('Move to frontend-rules')).toBeInTheDocument();
  });

  describe('picking a destination', () => {
    it('moves the artifact there', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({});
      mockUseMoveArtefactsToPackageMutation.mockReturnValue(
        createMockMoveMutation({ mutateAsync }),
      );

      renderPopover();
      openPopover();
      fireEvent.click(screen.getByLabelText('Move to frontend-rules'));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          packageId: destination.id,
          standardIds: [artifactId],
        });
      });
    });

    it('asks first when the package losing it is deployed', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({});
      mockUseMoveArtefactsToPackageMutation.mockReturnValue(
        createMockMoveMutation({ mutateAsync }),
      );
      setDeployedPackages([holder.id]);

      renderPopover();
      openPopover();
      fireEvent.click(screen.getByLabelText('Move to frontend-rules'));

      expect(
        await screen.findByText('Move this standard to frontend-rules?'),
      ).toBeInTheDocument();
      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });
});
