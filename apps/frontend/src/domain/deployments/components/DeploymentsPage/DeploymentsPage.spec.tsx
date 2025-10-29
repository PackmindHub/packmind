import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import {
  QueryClient,
  QueryClientProvider,
  UseQueryResult,
} from '@tanstack/react-query';
import { DeploymentsPage } from './DeploymentsPage';
import * as DeploymentQueries from '../../api/queries/DeploymentsQueries';
import { AuthProvider } from '../../../../providers/AuthProvider';

import {
  DeploymentOverview,
  StandardDeploymentOverview,
} from '@packmind/shared/types';
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

jest.mock('react-router', () => {
  const actual = jest.requireActual('react-router');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
    useParams: () => ({ orgSlug: 'test-org' }),
  };
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProvider = async (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  let renderResult;

  await act(async () => {
    renderResult = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <UIProvider>{ui}</UIProvider>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
  });

  // Wait for any async state updates from Chakra UI/Zag.js components
  await waitFor(() => {
    expect(document.body).toBeInTheDocument();
  });

  return renderResult;
};

jest.mock('../../api/queries/DeploymentsQueries', () => ({
  useGetRecipesDeploymentOverviewQuery: jest.fn(),
  useGetStandardsDeploymentOverviewQuery: jest.fn(),
}));

// Mock PMTable to avoid internal hook/state issues during tests
jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  const PMTable = () => <div data-testid="pm-table" />;
  return { ...actual, PMTable };
});

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

  it('displays view toggle buttons', async () => {
    await renderWithProvider(<DeploymentsPage />);

    expect(screen.getByText('Repositories')).toBeInTheDocument();
    expect(screen.getByText('Artifacts')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
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

    await renderWithProvider(<DeploymentsPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays search input field', async () => {
    await renderWithProvider(<DeploymentsPage />);
    // In repositories view, the search input is replaced by a repositories combobox
    expect(screen.getByPlaceholderText('All repositories')).toBeInTheDocument();
  });

  it('displays repository status dropdown', async () => {
    await renderWithProvider(<DeploymentsPage />);

    // Dropdown for repository status should be visible with its items
    // The combobox is closed by default, so only the placeholder is visible
    expect(screen.getByText('All statuses')).toBeInTheDocument();
  });

  // Removed recipe view; artifacts view now hosts the text search and status filter

  it('shows repository status dropdown in repository view', async () => {
    await renderWithProvider(<DeploymentsPage />);

    // In repository view (default) - the repository status select should be visible
    expect(screen.getByText('All statuses')).toBeInTheDocument();
    expect(screen.queryByText('Undeployed recipes')).not.toBeInTheDocument();
  });

  it('calls setSearchParams when switching views', async () => {
    const user = userEvent.setup();
    await renderWithProvider(<DeploymentsPage />);

    // Initially in repository view
    expect(screen.getByPlaceholderText('All repositories')).toBeInTheDocument();

    // Switch to artifacts view - should call setSearchParams
    await user.click(screen.getByText('Artifacts'));
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  describe('when typing in the search field', () => {
    beforeEach(() => jest.useFakeTimers());

    afterEach(() => jest.useRealTimers());

    it('debounces setSearchParams calls to avoid URL history pollution', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      // Start directly in artifacts view to avoid extra setSearchParams from tab switch
      mockSearchParams.set('view', 'artifacts');
      await renderWithProvider(<DeploymentsPage />);
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'test-search');

      // Initially, setSearchParams should not have been called due to debouncing
      expect(mockSetSearchParams).not.toHaveBeenCalled();

      // Fast-forward time to trigger the debounced function
      jest.advanceTimersByTime(500);

      // Now setSearchParams should have been called
      expect(mockSetSearchParams).toHaveBeenCalled();
    });
  });

  it('calls setSearchParams when changing repository status filter', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await renderWithProvider(<DeploymentsPage />);

    // Open the combobox via trigger button (more reliable than portal clicking)
    const comboPlaceholder = screen.getByText('All statuses');
    await user.click(comboPlaceholder);
    // Move to 'Outdated' (2nd item) and select
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    await waitFor(() => expect(mockSetSearchParams).toHaveBeenCalled());
  });

  it('maintains search state when switching views', async () => {
    const user = userEvent.setup();

    // Mock URL params to simulate search state
    mockSearchParams.set('search', 'test-search');

    await renderWithProvider(<DeploymentsPage />);
    // Switch to artifacts view where the text search input is displayed
    await user.click(screen.getByText('Artifacts'));
    // Verify initial search term by value
    expect(screen.getByDisplayValue('test-search')).toBeInTheDocument();

    // Switch to artifacts view again - this should call setSearchParams
    await user.click(screen.getByText('Artifacts'));

    // Verify that setSearchParams was called to update the view
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  describe('target filter state management', () => {
    it('automatically cleans up invalid target names when data updates', async () => {
      // Set up initial data with specific targets
      const initialData = createDeploymentOverview();
      const validTargetName =
        initialData.targets[0]?.target.name || 'Production';
      const invalidTargetName = 'invalid-target-name';

      // Mock URL params with both valid and invalid target names
      mockSearchParams.set(
        'targetFilter',
        `${validTargetName},${invalidTargetName}`,
      );

      mockUseGetRecipesDeploymentOverview.mockReturnValue({
        data: initialData,
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

      await renderWithProvider(<DeploymentsPage />);

      // Verify that setSearchParams was called to clean up invalid target names
      expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the URL update by calling the function passed to setSearchParams
      const updateFunction = mockSetSearchParams.mock.calls[0][0];
      const updatedParams = updateFunction(mockSearchParams);

      // The updated params should only contain the valid target name
      expect(updatedParams.get('targetFilter')).toBe(validTargetName);
    });

    it('removes targetFilter param when all selected targets become invalid', async () => {
      // Set up initial data
      const initialData = createDeploymentOverview();
      const invalidTargetName1 = 'invalid-target-1';
      const invalidTargetName2 = 'invalid-target-2';

      // Mock URL params with only invalid target names
      mockSearchParams.set(
        'targetFilter',
        `${invalidTargetName1},${invalidTargetName2}`,
      );

      mockUseGetRecipesDeploymentOverview.mockReturnValue({
        data: initialData,
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

      await renderWithProvider(<DeploymentsPage />);

      // Verify that setSearchParams was called to clean up invalid target names
      expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));

      // Simulate the URL update by calling the function passed to setSearchParams
      const updateFunction = mockSetSearchParams.mock.calls[0][0];
      const updatedParams = updateFunction(mockSearchParams);

      // The targetFilter param should be removed when no valid targets remain
      expect(updatedParams.has('targetFilter')).toBe(false);
    });

    it('does not update URL when all selected targets are valid', async () => {
      // Set up initial data with specific targets
      const initialData = createDeploymentOverview();
      const validTargetName =
        initialData.targets[0]?.target.name || 'Production';

      // Mock URL params with only valid target names
      mockSearchParams.set('targetFilter', validTargetName);

      mockUseGetRecipesDeploymentOverview.mockReturnValue({
        data: initialData,
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

      await renderWithProvider(<DeploymentsPage />);

      // setSearchParams should not be called when all targets are valid
      expect(mockSetSearchParams).not.toHaveBeenCalled();
    });
  });
});
