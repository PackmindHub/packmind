import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

import { MembershipChips } from './MembershipChips';
import {
  useRemoveArtefactsFromPackageMutation,
  useListActiveDistributedPackagesBySpaceQuery,
  useListPackagesBySpaceQuery,
} from '../../api/queries/DeploymentsQueries';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { usePackageMarketplaceStatus } from '@packmind/proprietary/frontend/domain/marketplaces/hooks/usePackageMarketplaceStatus';

jest.mock('../../api/queries/DeploymentsQueries', () => ({
  ...jest.requireActual('../../api/queries/DeploymentsQueries'),
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
jest.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: jest.fn(),
}));
jest.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: jest.fn(),
}));

const mockUseListPackagesBySpaceQuery =
  useListPackagesBySpaceQuery as jest.MockedFunction<
    typeof useListPackagesBySpaceQuery
  >;
const mockUseRemoveArtefactsFromPackageMutation =
  useRemoveArtefactsFromPackageMutation as jest.MockedFunction<
    typeof useRemoveArtefactsFromPackageMutation
  >;
const mockUseListActiveDistributedPackagesBySpaceQuery =
  useListActiveDistributedPackagesBySpaceQuery as jest.MockedFunction<
    typeof useListActiveDistributedPackagesBySpaceQuery
  >;
const mockUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;
const mockUseCurrentSpace = useCurrentSpace as jest.MockedFunction<
  typeof useCurrentSpace
>;
const mockUsePackageMarketplaceStatus =
  usePackageMarketplaceStatus as jest.MockedFunction<
    typeof usePackageMarketplaceStatus
  >;

const artifactId = createStandardId('std-1');
const organizationId = createOrganizationId('org-1');
const spaceId = createSpaceId('space-1');

const packageA: Package = {
  id: createPackageId('pkg-a'),
  name: 'frontend-rules',
  slug: 'frontend-rules',
  description: '',
  spaceId,
  createdBy: 'user-1' as Package['createdBy'],
  recipes: [],
  standards: [artifactId],
  skills: [],
};

const renderChips = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MembershipChips
            artifactId={artifactId}
            artifactType="standard"
            artifactName="My Standard"
            spaceId={spaceId}
            organizationId={organizationId}
          />
        </MemoryRouter>
      </QueryClientProvider>
    </UIProvider>,
  );
};

describe('MembershipChips', () => {
  beforeEach(() => {
    mockUseListPackagesBySpaceQuery.mockReturnValue({
      data: { packages: [packageA] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useListPackagesBySpaceQuery>);
    mockUseListActiveDistributedPackagesBySpaceQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<
      typeof useListActiveDistributedPackagesBySpaceQuery
    >);
    mockUseRemoveArtefactsFromPackageMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    } as unknown as ReturnType<typeof useRemoveArtefactsFromPackageMutation>);
    mockUseAuthContext.mockReturnValue({
      organization: { id: organizationId, slug: 'acme', name: 'Acme' },
    } as unknown as ReturnType<typeof useAuthContext>);
    mockUseCurrentSpace.mockReturnValue({
      spaceSlug: 'main',
      spaceId,
    } as unknown as ReturnType<typeof useCurrentSpace>);
    mockUsePackageMarketplaceStatus.mockReturnValue({
      getPublishedMarketplaces: () => 0,
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('links the package name to the package page', () => {
    renderChips();

    expect(
      screen.getByRole('link', { name: 'frontend-rules' }),
    ).toHaveAttribute('href', '/org/acme/space/main/packages/pkg-a');
  });

  it('falls back to plain text when the space slug is not resolved yet', () => {
    mockUseCurrentSpace.mockReturnValue({
      spaceSlug: undefined,
      spaceId,
    } as unknown as ReturnType<typeof useCurrentSpace>);

    renderChips();

    expect(screen.getByText('frontend-rules')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'frontend-rules' }),
    ).not.toBeInTheDocument();
  });

  it('removes instantly from an undeployed package without a confirmation', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockUseRemoveArtefactsFromPackageMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRemoveArtefactsFromPackageMutation>);

    renderChips();

    fireEvent.click(screen.getByLabelText('Remove from frontend-rules'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        spaceId,
        packageId: packageA.id,
        standardIds: [artifactId],
      });
    });
    expect(
      screen.queryByText('Remove from frontend-rules?'),
    ).not.toBeInTheDocument();
  });

  it('asks for confirmation when the package is deployed', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockUseRemoveArtefactsFromPackageMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRemoveArtefactsFromPackageMutation>);
    mockUseListActiveDistributedPackagesBySpaceQuery.mockReturnValue({
      data: [{ targetId: 'target-1', packages: [{ packageId: packageA.id }] }],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<
      typeof useListActiveDistributedPackagesBySpaceQuery
    >);

    renderChips();

    fireEvent.click(screen.getByLabelText('Remove from frontend-rules'));

    expect(
      await screen.findByText('Remove from frontend-rules?'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('asks for confirmation when the package is only published to a marketplace', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockUseRemoveArtefactsFromPackageMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRemoveArtefactsFromPackageMutation>);
    mockUsePackageMarketplaceStatus.mockReturnValue({
      getPublishedMarketplaces: (packageId) =>
        packageId?.toString() === packageA.id.toString() ? 1 : 0,
      isLoading: false,
      isError: false,
    });

    renderChips();

    fireEvent.click(screen.getByLabelText('Remove from frontend-rules'));

    expect(
      await screen.findByText('Remove from frontend-rules?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/frontend-rules is deployed to 1 marketplace/),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
