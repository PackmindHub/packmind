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

jest.mock('../hooks/useAuthContext');
jest.mock('../../spaces/api/queries/SpacesQueries');
jest.mock('../../deployments/api/queries/DeploymentsQueries');
jest.mock('./LocalEnvironmentSetup/hooks', () => ({
  useCliLoginCode: jest.fn(() => ({
    loginCode: 'TEST-CODE-123',
    codeExpiresAt: new Date(Date.now() + 3600000),
    isGenerating: false,
    regenerate: jest.fn(),
  })),
}));

const mockedUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;
const mockedUseGetSpacesQuery = useGetSpacesQuery as jest.MockedFunction<
  typeof useGetSpacesQuery
>;
const mockedUseListPackagesBySpaceQuery =
  useListPackagesBySpaceQuery as jest.MockedFunction<
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
    jest.clearAllMocks();
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
      refetch: jest.fn(),
      remove: jest.fn(),
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
        <DeployWithCliModal open={false} onClose={jest.fn()} />,
      );

      expect(screen.queryByText('Deploy with CLI')).not.toBeInTheDocument();
    });
  });

  describe('when modal is open', () => {
    it('renders the dialog title', () => {
      renderWithProviders(
        <DeployWithCliModal open={true} onClose={jest.fn()} />,
      );

      expect(screen.getByText('Deploy with CLI')).toBeInTheDocument();
    });

    it('renders three tab triggers', () => {
      renderWithProviders(
        <DeployWithCliModal open={true} onClose={jest.fn()} />,
      );

      expect(screen.getByText('1. Install CLI')).toBeInTheDocument();
      expect(screen.getByText('2. Authenticate')).toBeInTheDocument();
      expect(screen.getByText('3. Distribute')).toBeInTheDocument();
    });

    describe('when no packages are available', () => {
      it('displays message about no packages', () => {
        renderWithProviders(
          <DeployWithCliModal open={true} onClose={jest.fn()} />,
        );

        expect(screen.getByText(/No packages available/i)).toBeInTheDocument();
      });
    });

    describe('when packages are available', () => {
      it('displays package list', () => {
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
          refetch: jest.fn(),
          remove: jest.fn(),
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
          <DeployWithCliModal open={true} onClose={jest.fn()} />,
        );

        expect(screen.getByText('Test Package')).toBeInTheDocument();
        expect(screen.getByText('Slug: test-package')).toBeInTheDocument();
        expect(
          screen.getByDisplayValue('packmind-cli install test-package'),
        ).toBeInTheDocument();

        expect(screen.getByText('Another Package')).toBeInTheDocument();
        expect(screen.getByText('Slug: another-package')).toBeInTheDocument();
        expect(
          screen.getByDisplayValue('packmind-cli install another-package'),
        ).toBeInTheDocument();
      });
    });
  });
});
