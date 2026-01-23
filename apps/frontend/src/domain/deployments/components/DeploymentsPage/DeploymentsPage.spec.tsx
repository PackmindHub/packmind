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
  SkillDeploymentOverview,
} from '@packmind/types';
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
  useGetSkillsDeploymentOverviewQuery: jest.fn(),
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
const mockUseGetSkillsDeploymentOverview =
  DeploymentQueries.useGetSkillsDeploymentOverviewQuery as jest.MockedFunction<
    typeof DeploymentQueries.useGetSkillsDeploymentOverviewQuery
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

    mockUseGetSkillsDeploymentOverview.mockReturnValue({
      data: { repositories: [], skills: [] },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: jest.fn(),
    } as Partial<
      UseQueryResult<SkillDeploymentOverview, Error>
    > as UseQueryResult<SkillDeploymentOverview, Error>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('view toggle buttons', () => {
    beforeEach(async () => {
      await renderWithProvider(<DeploymentsPage />);
    });

    it('displays Repositories button', async () => {
      expect(screen.getByText('Repositories')).toBeInTheDocument();
    });

    it('displays Artifacts button', async () => {
      expect(screen.getByText('Artifacts')).toBeInTheDocument();
    });
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

    mockUseGetSkillsDeploymentOverview.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isPending: true,
      isSuccess: false,
      refetch: jest.fn(),
    } as Partial<
      UseQueryResult<SkillDeploymentOverview, Error>
    > as UseQueryResult<SkillDeploymentOverview, Error>);

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

  describe('repository view', () => {
    beforeEach(async () => {
      await renderWithProvider(<DeploymentsPage />);
    });

    it('displays repository status dropdown', async () => {
      expect(screen.getByText('All statuses')).toBeInTheDocument();
    });

    it('hides undeployed recipes option', async () => {
      expect(screen.queryByText('Undeployed recipes')).not.toBeInTheDocument();
    });
  });

  describe('when switching views', () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(async () => {
      user = userEvent.setup();
      await renderWithProvider(<DeploymentsPage />);
    });

    it('starts in repository view', async () => {
      expect(
        screen.getByPlaceholderText('All repositories'),
      ).toBeInTheDocument();
    });

    it('calls setSearchParams after clicking Artifacts', async () => {
      await user.click(screen.getByText('Artifacts'));
      expect(mockSetSearchParams).toHaveBeenCalled();
    });
  });

  describe('when typing in the search field', () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(async () => {
      jest.useFakeTimers();
      user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      // Start directly in artifacts view to avoid extra setSearchParams from tab switch
      mockSearchParams.set('view', 'artifacts');
      await renderWithProvider(<DeploymentsPage />);
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'test-search');
    });

    afterEach(() => jest.useRealTimers());

    it('debounces setSearchParams calls initially', async () => {
      expect(mockSetSearchParams).not.toHaveBeenCalled();
    });

    it('calls setSearchParams after debounce timeout', async () => {
      jest.advanceTimersByTime(500);
      expect(mockSetSearchParams).toHaveBeenCalled();
    });
  });

  describe('when changing repository status filter', () => {
    it('calls setSearchParams', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      await renderWithProvider(<DeploymentsPage />);

      // Open the combobox via trigger button (more reliable than portal clicking)
      const comboPlaceholder = screen.getByText('All statuses');
      await user.click(comboPlaceholder);
      // Move to 'Outdated' (2nd item) and select
      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

      await waitFor(() => expect(mockSetSearchParams).toHaveBeenCalled());
    });
  });

  describe('when switching views with existing search state', () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(async () => {
      user = userEvent.setup();
      // Mock URL params to simulate search state
      mockSearchParams.set('search', 'test-search');
      await renderWithProvider(<DeploymentsPage />);
      // Switch to artifacts view where the text search input is displayed
      await user.click(screen.getByText('Artifacts'));
    });

    it('maintains search term in artifacts view', async () => {
      expect(screen.getByDisplayValue('test-search')).toBeInTheDocument();
    });

    it('calls setSearchParams after clicking Artifacts again', async () => {
      await user.click(screen.getByText('Artifacts'));
      expect(mockSetSearchParams).toHaveBeenCalled();
    });
  });

  describe('target filter state management', () => {
    describe('when data updates with mixed valid and invalid target names', () => {
      const initialData = createDeploymentOverview();
      const validTargetName =
        initialData.targets[0]?.target.name || 'Production';
      const invalidTargetName = 'invalid-target-name';

      beforeEach(async () => {
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
        } as Partial<
          UseQueryResult<DeploymentOverview, Error>
        > as UseQueryResult<DeploymentOverview, Error>);

        await renderWithProvider(<DeploymentsPage />);
      });

      it('calls setSearchParams to clean up invalid target names', async () => {
        expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));
      });

      it('keeps only valid target name in updated params', async () => {
        const updateFunction = mockSetSearchParams.mock.calls[0][0];
        const updatedParams = updateFunction(mockSearchParams);
        expect(updatedParams.get('targetFilter')).toBe(validTargetName);
      });
    });

    describe('when all selected targets become invalid', () => {
      beforeEach(async () => {
        const initialData = createDeploymentOverview();
        const invalidTargetName1 = 'invalid-target-1';
        const invalidTargetName2 = 'invalid-target-2';

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
        } as Partial<
          UseQueryResult<DeploymentOverview, Error>
        > as UseQueryResult<DeploymentOverview, Error>);

        await renderWithProvider(<DeploymentsPage />);
      });

      it('calls setSearchParams to clean up invalid target names', async () => {
        expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));
      });

      it('removes targetFilter param from updated params', async () => {
        const updateFunction = mockSetSearchParams.mock.calls[0][0];
        const updatedParams = updateFunction(mockSearchParams);
        expect(updatedParams.has('targetFilter')).toBe(false);
      });
    });

    describe('when all selected targets are valid', () => {
      it('does not call setSearchParams', async () => {
        const initialData = createDeploymentOverview();
        const validTargetName =
          initialData.targets[0]?.target.name || 'Production';

        mockSearchParams.set('targetFilter', validTargetName);

        mockUseGetRecipesDeploymentOverview.mockReturnValue({
          data: initialData,
          isLoading: false,
          error: null,
          isError: false,
          isPending: false,
          isSuccess: true,
          refetch: jest.fn(),
        } as Partial<
          UseQueryResult<DeploymentOverview, Error>
        > as UseQueryResult<DeploymentOverview, Error>);

        await renderWithProvider(<DeploymentsPage />);

        expect(mockSetSearchParams).not.toHaveBeenCalled();
      });
    });
  });
});
