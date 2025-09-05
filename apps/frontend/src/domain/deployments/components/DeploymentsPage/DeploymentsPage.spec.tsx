import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  QueryClient,
  QueryClientProvider,
  UseQueryResult,
} from '@tanstack/react-query';
import { DeploymentsPage } from './DeploymentsPage';
import * as DeploymentQueries from '../../api/queries/DeploymentsQueries';

import { StandardDeploymentOverview } from '@packmind/deployments';
import { DeploymentOverview } from '@packmind/shared';
import {
  createDeploymentOverview,
  createStandardDeploymentOverview,
} from '@packmind/deployments/test';

// Mock react-router
const mockSetSearchParams = jest.fn();
const mockSearchParams = new URLSearchParams();

// Make mockSetSearchParams actually update mockSearchParams for testing
mockSetSearchParams.mockImplementation((updateFn) => {
  if (typeof updateFn === 'function') {
    const updatedParams = updateFn(mockSearchParams);
    // Copy all the updated params back to mockSearchParams
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    for (const [key, value] of updatedParams.entries()) {
      mockSearchParams.set(key, value);
    }
  }
});

jest.mock('react-router', () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProvider = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UIProvider>{ui}</UIProvider>
    </QueryClientProvider>,
  );
};

jest.mock('../../api/queries/DeploymentsQueries', () => ({
  useGetRecipesDeploymentOverviewQuery: jest.fn(),
  useGetStandardsDeploymentOverviewQuery: jest.fn(),
}));

const mockUseGetRecipesDeploymentOverview =
  DeploymentQueries.useGetRecipesDeploymentOverviewQuery as jest.MockedFunction<
    typeof DeploymentQueries.useGetRecipesDeploymentOverviewQuery
  >;
const mockUseGetStandardsDeploymentOverview =
  DeploymentQueries.useGetStandardsDeploymentOverviewQuery as jest.MockedFunction<
    typeof DeploymentQueries.useGetStandardsDeploymentOverviewQuery
  >;

describe('DeploymentsPage', () => {
  beforeEach(() => {
    // Reset URL params mock
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    mockSetSearchParams.mockClear();

    mockUseGetRecipesDeploymentOverview.mockReturnValue({
      data: createDeploymentOverview(),
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: jest.fn(),
    } as Partial<UseQueryResult<DeploymentOverview, Error>> as UseQueryResult<
      DeploymentOverview,
      Error
    >);

    mockUseGetStandardsDeploymentOverview.mockReturnValue({
      data: createStandardDeploymentOverview(),
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: jest.fn(),
    } as Partial<
      UseQueryResult<StandardDeploymentOverview, Error>
    > as UseQueryResult<StandardDeploymentOverview, Error>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays view toggle buttons', () => {
    renderWithProvider(<DeploymentsPage />);

    expect(screen.getByText('Repositories')).toBeInTheDocument();
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    expect(screen.getByText('Standards')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockUseGetRecipesDeploymentOverview.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isPending: true,
      isSuccess: false,
      refetch: jest.fn(),
    } as Partial<UseQueryResult<DeploymentOverview, Error>> as UseQueryResult<
      DeploymentOverview,
      Error
    >);

    mockUseGetStandardsDeploymentOverview.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isPending: true,
      isSuccess: false,
      refetch: jest.fn(),
    } as Partial<
      UseQueryResult<StandardDeploymentOverview, Error>
    > as UseQueryResult<StandardDeploymentOverview, Error>);

    renderWithProvider(<DeploymentsPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays search input field', () => {
    renderWithProvider(<DeploymentsPage />);

    expect(
      screen.getByPlaceholderText('Search repositories...'),
    ).toBeInTheDocument();
  });

  it('displays repository filter dropdown', () => {
    renderWithProvider(<DeploymentsPage />);

    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
    expect(screen.getByText('All repositories')).toBeInTheDocument();
    expect(screen.getByText('Only outdated repositories')).toBeInTheDocument();
  });

  it('displays recipe filter dropdown in recipe view', async () => {
    // Set up URL params to start in recipe view
    mockSearchParams.set('view', 'recipes');

    renderWithProvider(<DeploymentsPage />);

    // Recipe dropdown should be visible
    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
    expect(screen.getByText('All recipes')).toBeInTheDocument();
    expect(screen.getByText('Outdated recipes')).toBeInTheDocument();
    expect(screen.getByText('Undeployed recipes')).toBeInTheDocument();
  });

  it('shows repository filter options in repository view', () => {
    renderWithProvider(<DeploymentsPage />);

    // In repository view (default) - only repository options should be visible
    expect(screen.getByText('All repositories')).toBeInTheDocument();
    expect(screen.getByText('Only outdated repositories')).toBeInTheDocument();
    expect(screen.queryByText('Undeployed recipes')).not.toBeInTheDocument();
  });

  it('calls setSearchParams when switching views', async () => {
    const user = userEvent.setup();
    renderWithProvider(<DeploymentsPage />);

    // Initially in repository view
    expect(
      screen.getByPlaceholderText('Search repositories...'),
    ).toBeInTheDocument();

    // Switch to recipe view - should call setSearchParams
    await user.click(screen.getByText('Recipes'));
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  describe('when typing in the search field', () => {
    beforeEach(() => jest.useFakeTimers());

    afterEach(() => jest.useRealTimers());

    it('debounces setSearchParams calls to avoid URL history pollution', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderWithProvider(<DeploymentsPage />);

      const searchInput = screen.getByPlaceholderText('Search repositories...');
      await user.type(searchInput, 'test-search');

      // Initially, setSearchParams should not have been called due to debouncing
      expect(mockSetSearchParams).not.toHaveBeenCalled();

      // Fast-forward time to trigger the debounced function
      jest.advanceTimersByTime(500);

      // Now setSearchParams should have been called
      expect(mockSetSearchParams).toHaveBeenCalled();
    });
  });

  it('calls setSearchParams when changing filter selection', async () => {
    const user = userEvent.setup();
    renderWithProvider(<DeploymentsPage />);

    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toHaveValue('all');

    await user.selectOptions(dropdown, 'outdated');

    // Verify that setSearchParams was called for filter updates
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  it('maintains search state when switching views', async () => {
    const user = userEvent.setup();

    // Mock URL params to simulate search state
    mockSearchParams.set('search', 'test-search');

    renderWithProvider(<DeploymentsPage />);

    // Verify initial search term
    const searchInput = screen.getByPlaceholderText('Search repositories...');
    expect(searchInput).toHaveValue('test-search');

    // Switch to recipe view - this should call setSearchParams
    await user.click(screen.getByText('Recipes'));

    // Verify that setSearchParams was called to update the view
    expect(mockSetSearchParams).toHaveBeenCalled();
  });
});
