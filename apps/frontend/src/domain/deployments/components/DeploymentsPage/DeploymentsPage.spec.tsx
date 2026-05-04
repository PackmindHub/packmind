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
import { ActiveDistributedPackagesByTarget } from '@packmind/types';
import {
  createActivePackage,
  createActiveDistributedPackagesByTarget,
  createDeployedRecipeTargetInfo,
  packageFactory,
} from '@packmind/deployments/test';

const mockSetSearchParams = jest.fn();
const mockSearchParams = new URLSearchParams();

mockSetSearchParams.mockImplementation((updateFn) => {
  if (typeof updateFn === 'function') {
    const updatedParams = updateFn(mockSearchParams);
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

  await waitFor(() => {
    expect(document.body).toBeInTheDocument();
  });

  return renderResult;
};

jest.mock('../../api/queries/DeploymentsQueries', () => ({
  useListActiveDistributedPackagesBySpaceQuery: jest.fn(),
  useDeployPackagesMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({
    spaceId: 'space-id-1',
    spaceSlug: 'test-space',
    spaceName: 'Test Space',
    space: { organizationId: 'org-id-1' },
    isLoading: false,
  }),
}));

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  const PMTable = () => <div data-testid="pm-table" />;
  return { ...actual, PMTable };
});

const mockUseListActiveDistributedPackagesBySpace =
  DeploymentQueries.useListActiveDistributedPackagesBySpaceQuery as jest.MockedFunction<
    typeof DeploymentQueries.useListActiveDistributedPackagesBySpaceQuery
  >;

const mockOverview = (entries: ActiveDistributedPackagesByTarget[]) =>
  ({
    data: entries,
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: true,
    refetch: jest.fn(),
  }) as Partial<
    UseQueryResult<ActiveDistributedPackagesByTarget[], Error>
  > as UseQueryResult<ActiveDistributedPackagesByTarget[], Error>;

const buildDefaultEntries = (): ActiveDistributedPackagesByTarget[] => {
  const recipeInfo = createDeployedRecipeTargetInfo();
  const pkg = packageFactory({
    name: 'pkg',
    recipes: [recipeInfo.recipe.id],
  });
  return [
    createActiveDistributedPackagesByTarget({
      packages: [
        createActivePackage({
          package: pkg,
          deployedRecipes: [recipeInfo],
        }),
      ],
    }),
  ];
};

describe('DeploymentsPage', () => {
  beforeEach(() => {
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    mockSetSearchParams.mockClear();

    mockUseListActiveDistributedPackagesBySpace.mockReturnValue(
      mockOverview(buildDefaultEntries()),
    );
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
    mockUseListActiveDistributedPackagesBySpace.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isPending: true,
      isSuccess: false,
      refetch: jest.fn(),
    } as Partial<
      UseQueryResult<ActiveDistributedPackagesByTarget[], Error>
    > as UseQueryResult<ActiveDistributedPackagesByTarget[], Error>);

    await renderWithProvider(<DeploymentsPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays repository combobox', async () => {
    await renderWithProvider(<DeploymentsPage />);
    expect(screen.getByPlaceholderText('All repositories')).toBeInTheDocument();
  });

  it('displays repository status dropdown', async () => {
    await renderWithProvider(<DeploymentsPage />);
    expect(screen.getByText('All statuses')).toBeInTheDocument();
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

      const comboPlaceholder = screen.getByText('All statuses');
      await user.click(comboPlaceholder);
      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

      await waitFor(() => expect(mockSetSearchParams).toHaveBeenCalled());
    });
  });

  describe('target filter state management', () => {
    describe('when data updates with mixed valid and invalid target names', () => {
      const entries = buildDefaultEntries();
      const validTargetName = entries[0].target.name;
      const invalidTargetName = 'invalid-target-name';

      beforeEach(async () => {
        mockSearchParams.set(
          'targetFilter',
          `${validTargetName},${invalidTargetName}`,
        );
        mockUseListActiveDistributedPackagesBySpace.mockReturnValue(
          mockOverview(entries),
        );
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
        const entries = buildDefaultEntries();
        const invalidTargetName1 = 'invalid-target-1';
        const invalidTargetName2 = 'invalid-target-2';

        mockSearchParams.set(
          'targetFilter',
          `${invalidTargetName1},${invalidTargetName2}`,
        );
        mockUseListActiveDistributedPackagesBySpace.mockReturnValue(
          mockOverview(entries),
        );
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
        const entries = buildDefaultEntries();
        const validTargetName = entries[0].target.name;

        mockSearchParams.set('targetFilter', validTargetName);
        mockUseListActiveDistributedPackagesBySpace.mockReturnValue(
          mockOverview(entries),
        );

        await renderWithProvider(<DeploymentsPage />);

        expect(mockSetSearchParams).not.toHaveBeenCalled();
      });
    });
  });
});
