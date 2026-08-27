import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { DeployWithCliModal } from './DeployWithCliModal';
import { useAuthContext } from '../hooks/useAuthContext';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import type { MockedFunction } from 'vitest';

vi.mock('../hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}));
vi.mock('../../spaces/api/queries/SpacesQueries', () => ({
  useGetSpacesQuery: vi.fn(),
}));
vi.mock('../../deployments/api/queries/DeploymentsQueries', () => ({
  useListPackagesBySpaceQuery: vi.fn(),
}));
vi.mock('./LocalEnvironmentSetup/hooks', () => ({
  useCliLoginCode: vi.fn(() => ({
    loginCode: 'TEST-CODE-123',
    codeExpiresAt: new Date(Date.now() + 3600000),
    isGenerating: false,
    regenerate: vi.fn(),
  })),
}));

const mockedUseAuthContext = useAuthContext as MockedFunction<
  typeof useAuthContext
>;
const mockedUseGetSpacesQuery = useGetSpacesQuery as MockedFunction<
  typeof useGetSpacesQuery
>;
const mockedUseListPackagesBySpaceQuery =
  useListPackagesBySpaceQuery as MockedFunction<
    typeof useListPackagesBySpaceQuery
  >;

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
};

describe('DeployWithCliModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuthContext.mockReturnValue({
      organization: { id: 'org-1', slug: 'test-org' },
    } as ReturnType<typeof useAuthContext>);
    mockedUseGetSpacesQuery.mockReturnValue({
      data: [{ id: 'space-1', slug: 'test-space', name: 'Test Space' }],
    } as ReturnType<typeof useGetSpacesQuery>);
    mockedUseListPackagesBySpaceQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn(),
      remove: vi.fn(),
      status: 'success',
      fetchStatus: 'idle',
      isFetching: false,
      isRefetching: false,
      failureCount: 0,
      isPaused: false,
      isStale: false,
      isPlaceholderData: false,
      isPreviousData: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
    } as unknown as ReturnType<typeof useListPackagesBySpaceQuery>);
  });

  describe('when modal is closed', () => {
    it('does not render dialog content', () => {
      renderWithProviders(
        <DeployWithCliModal open={false} onClose={vi.fn()} />,
      );

      expect(screen.queryByText('Deploy with CLI')).not.toBeInTheDocument();
    });
  });

  describe('when modal is open', () => {
    describe('with default state', () => {
      beforeEach(() => {
        renderWithProviders(
          <DeployWithCliModal open={true} onClose={vi.fn()} />,
        );
      });

      it('renders the dialog title', () => {
        expect(screen.getByText('Deploy with CLI')).toBeInTheDocument();
      });

      it('renders Install CLI tab trigger', () => {
        expect(screen.getByText('1. Install CLI')).toBeInTheDocument();
      });

      it('renders Authenticate tab trigger', () => {
        expect(screen.getByText('2. Authenticate')).toBeInTheDocument();
      });

      it('renders Distribute tab trigger', () => {
        expect(screen.getByText('3. Distribute')).toBeInTheDocument();
      });

      it('displays message about no packages', () => {
        expect(screen.getByText(/No packages available/i)).toBeInTheDocument();
      });
    });

    describe('when packages are available', () => {
      beforeEach(() => {
        mockedUseListPackagesBySpaceQuery.mockReturnValue({
          data: {
            packages: [
              {
                id: 'pkg-1',
                name: 'Test Package',
                slug: 'test-package',
              },
              {
                id: 'pkg-2',
                name: 'Another Package',
                slug: 'another-package',
              },
            ],
          },
          isLoading: false,
          isError: false,
          isSuccess: true,
          error: null,
          refetch: vi.fn(),
          remove: vi.fn(),
          status: 'success',
          fetchStatus: 'idle',
          isFetching: false,
          isRefetching: false,
          failureCount: 0,
          isPaused: false,
          isStale: false,
          isPlaceholderData: false,
          isPreviousData: false,
          dataUpdatedAt: Date.now(),
          errorUpdatedAt: 0,
        } as unknown as ReturnType<typeof useListPackagesBySpaceQuery>);

        renderWithProviders(
          <DeployWithCliModal open={true} onClose={vi.fn()} />,
        );
      });

      it('displays Test Package name', () => {
        expect(screen.getByText('Test Package')).toBeInTheDocument();
      });

      it('displays install command for test-package', () => {
        expect(
          screen.getByDisplayValue('packmind install @test-space/test-package'),
        ).toBeInTheDocument();
      });

      it('displays Another Package name', () => {
        expect(screen.getByText('Another Package')).toBeInTheDocument();
      });

      it('displays install command for another-package', () => {
        expect(
          screen.getByDisplayValue(
            'packmind install @test-space/another-package',
          ),
        ).toBeInTheDocument();
      });
    });
  });
});
