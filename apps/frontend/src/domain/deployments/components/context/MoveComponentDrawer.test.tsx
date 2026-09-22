import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  PackageResponse,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createStandardId,
} from '@packmind/types';
import type { Mock, MockedFunction } from 'vitest';

import { MoveComponentDrawer } from './MoveComponentDrawer';
import type { ContextComponent } from './buildPackageContext';
import {
  useListActiveDistributedPackagesBySpaceQuery,
  useMoveArtefactsToPackageMutation,
} from '../../api/queries/DeploymentsQueries';
import { usePackageMarketplaceStatus } from '@packmind/proprietary/frontend/domain/marketplaces/hooks/usePackageMarketplaceStatus';

vi.mock('../../api/queries/DeploymentsQueries', async () => ({
  ...(await vi.importActual('../../api/queries/DeploymentsQueries')),
  useMoveArtefactsToPackageMutation: vi.fn(),
  useListActiveDistributedPackagesBySpaceQuery: vi.fn(),
}));
vi.mock(
  '@packmind/proprietary/frontend/domain/marketplaces/hooks/usePackageMarketplaceStatus',
  () => ({ usePackageMarketplaceStatus: vi.fn() }),
);

const mockUseMoveArtefactsToPackageMutation =
  useMoveArtefactsToPackageMutation as MockedFunction<
    typeof useMoveArtefactsToPackageMutation
  >;
const mockUseListActiveDistributedPackagesBySpaceQuery =
  useListActiveDistributedPackagesBySpaceQuery as MockedFunction<
    typeof useListActiveDistributedPackagesBySpaceQuery
  >;
const mockUsePackageMarketplaceStatus =
  usePackageMarketplaceStatus as MockedFunction<
    typeof usePackageMarketplaceStatus
  >;

const spaceId = createSpaceId('space-1');
const organizationId = createOrganizationId('org-1');
const standardId = createStandardId('std-1');

const component: ContextComponent = {
  key: standardId,
  type: 'standard',
  name: 'My Standard',
  summary: '',
  version: 1,
  href: '/standards/std-1',
  createdAt: null,
};

const buildPackage = (
  id: string,
  name: string,
  standards: string[] = [],
): PackageResponse =>
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
  }) as unknown as PackageResponse;

const source = buildPackage('pkg-source', 'already-here', [standardId]);
const destination = buildPackage('pkg-dest', 'frontend-rules');

const createMockMoveMutation = (mutateAsync = vi.fn().mockResolvedValue({})) =>
  ({
    mutate: vi.fn(),
    mutateAsync,
    isPending: false,
    reset: vi.fn(),
  }) as unknown as ReturnType<typeof useMoveArtefactsToPackageMutation>;

const renderDrawer = (
  overrides: Partial<React.ComponentProps<typeof MoveComponentDrawer>> = {},
) =>
  render(
    <UIProvider>
      <MoveComponentDrawer
        open
        onOpenChange={vi.fn()}
        components={[component]}
        source={source}
        packages={[source, destination]}
        spaceId={spaceId}
        organizationId={organizationId}
        onCreatePackage={vi.fn()}
        {...overrides}
      />
    </UIProvider>,
  );

describe('MoveComponentDrawer', () => {
  beforeEach(() => {
    mockUseMoveArtefactsToPackageMutation.mockReturnValue(
      createMockMoveMutation(),
    );
    mockUseListActiveDistributedPackagesBySpaceQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<
      typeof useListActiveDistributedPackagesBySpaceQuery
    >);
    mockUsePackageMarketplaceStatus.mockReturnValue({
      getPublishedMarketplaces: () => 0,
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('picking a destination', () => {
    let mutateAsync: Mock;

    beforeEach(async () => {
      mutateAsync = vi.fn().mockResolvedValue({});
      mockUseMoveArtefactsToPackageMutation.mockReturnValue(
        createMockMoveMutation(mutateAsync),
      );

      renderDrawer();
      fireEvent.click(await screen.findByText('Move here'));
    });

    it('moves the component in a single call', async () => {
      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          spaceId,
          packageId: destination.id,
          standardIds: [standardId],
        });
      });
    });

    it('makes no second call to empty the source', async () => {
      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when the move fails', () => {
    let mutateAsync: Mock;
    let onMoved: Mock;
    let onOpenChange: Mock;

    beforeEach(async () => {
      mutateAsync = vi.fn().mockRejectedValue(new Error('boom'));
      onMoved = vi.fn();
      onOpenChange = vi.fn();
      mockUseMoveArtefactsToPackageMutation.mockReturnValue(
        createMockMoveMutation(mutateAsync),
      );

      renderDrawer({ onMoved, onOpenChange });
      fireEvent.click(await screen.findByText('Move here'));
      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalled();
      });
    });

    it('does not announce the move to the surface that opened it', () => {
      expect(onMoved).not.toHaveBeenCalled();
    });

    it('keeps the drawer open so the move can be retried', () => {
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });
});
