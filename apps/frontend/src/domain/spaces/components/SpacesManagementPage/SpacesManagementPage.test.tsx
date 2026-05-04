import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { SpacesManagementPage } from './SpacesManagementPage';
import * as queries from '../../api/queries/SpacesQueries';
import * as SpacesManagementQueriesModule from '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries';
import * as DeploymentsQueriesModule from '../../../deployments/api/queries/DeploymentsQueries';
import * as UseNavigationModule from '../../../../shared/hooks/useNavigation';
import * as UserQueriesModule from '../../../accounts/api/queries/UserQueries';

jest.mock('./SpacesToolbar', () => ({
  SpacesToolbar: () => null,
}));

jest.mock(
  '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
  () => ({
    ...jest.requireActual(
      '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries',
    ),
    useDeleteSpaceMutation: jest.fn(() => ({
      mutate: jest.fn(),
      isPending: false,
    })),
    useUpdateSpaceMutation: jest.fn(() => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
    })),
    useLeaveSpaceMutation: jest.fn(() => ({
      mutate: jest.fn(),
      isPending: false,
    })),
  }),
);

jest.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'current-user-id' },
    organization: {
      id: 'org-1',
      name: 'Test Organization',
      slug: 'test-org',
      role: 'admin',
    },
  }),
}));

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  return {
    ...actual,
    PMTable: ({
      columns,
      data,
    }: {
      columns: { key: string; header: React.ReactNode }[];
      data: Record<string, React.ReactNode>[];
    }) => (
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} role="row">
              {columns.map((col) => (
                <td key={col.key}>{row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
  };
});

const buildItem = (overrides: Record<string, unknown> = {}) => ({
  id: 's1',
  name: 'Engineering',
  slug: 'engineering',
  type: 'open',
  color: 'blue',
  organizationId: 'org-1',
  isDefaultSpace: false,
  admins: [],
  membersCount: 0,
  artifactsCount: 0,
  createdAt: '2025-01-12T00:00:00.000Z',
  ...overrides,
});

const mockDrawerDependencies = () => {
  jest.spyOn(queries, 'useGetSpaceMembersQuery').mockReturnValue({
    data: { members: [] },
    isLoading: false,
  } as unknown as ReturnType<typeof queries.useGetSpaceMembersQuery>);

  jest.spyOn(queries, 'useRemoveMemberFromSpaceMutation').mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof queries.useRemoveMemberFromSpaceMutation>);

  jest.spyOn(queries, 'useUpdateMemberRoleMutation').mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof queries.useUpdateMemberRoleMutation>);

  jest
    .mocked(SpacesManagementQueriesModule.useUpdateSpaceMutation)
    .mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<
      typeof SpacesManagementQueriesModule.useUpdateSpaceMutation
    >);

  jest
    .mocked(SpacesManagementQueriesModule.useLeaveSpaceMutation)
    .mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<
      typeof SpacesManagementQueriesModule.useLeaveSpaceMutation
    >);

  jest
    .spyOn(DeploymentsQueriesModule, 'useListPackagesBySpaceQuery')
    .mockReturnValue({
      data: { packages: [] },
    } as unknown as ReturnType<
      typeof DeploymentsQueriesModule.useListPackagesBySpaceQuery
    >);

  jest.spyOn(UseNavigationModule, 'useNavigation').mockReturnValue({
    org: { toDashboard: jest.fn() },
  } as unknown as ReturnType<typeof UseNavigationModule.useNavigation>);

  jest
    .spyOn(UserQueriesModule, 'useGetUsersInMyOrganizationQuery')
    .mockReturnValue({
      data: { users: [] },
      isLoading: false,
    } as unknown as ReturnType<
      typeof UserQueriesModule.useGetUsersInMyOrganizationQuery
    >);
};

const renderWithQuery = (ui: React.ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <UIProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </UIProvider>,
  );
};

describe('SpacesManagementPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders a search input', () => {
    jest
      .spyOn(queries, 'useGetOrganizationSpacesForManagementQuery')
      .mockReturnValue({
        data: {
          items: [buildItem({ name: 'Engineering' })],
          totalCount: 1,
          page: 1,
          pageSize: 8,
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<
        typeof queries.useGetOrganizationSpacesForManagementQuery
      >);

    renderWithQuery(<SpacesManagementPage />);

    expect(
      screen.getByPlaceholderText('Search by name...'),
    ).toBeInTheDocument();
  });

  it('filters spaces by name when searching', async () => {
    jest
      .spyOn(queries, 'useGetOrganizationSpacesForManagementQuery')
      .mockReturnValue({
        data: {
          items: [
            buildItem({ id: 's1', name: 'Engineering' }),
            buildItem({ id: 's2', name: 'Frontend' }),
          ],
          totalCount: 2,
          page: 1,
          pageSize: 8,
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<
        typeof queries.useGetOrganizationSpacesForManagementQuery
      >);

    renderWithQuery(<SpacesManagementPage />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Search by name...'), 'Eng');

    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.queryByText('Frontend')).not.toBeInTheDocument();
  });

  it('renders rows from the new management query', async () => {
    jest
      .spyOn(queries, 'useGetOrganizationSpacesForManagementQuery')
      .mockReturnValue({
        data: {
          items: [buildItem({ name: 'Engineering' })],
          totalCount: 1,
          page: 1,
          pageSize: 8,
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<
        typeof queries.useGetOrganizationSpacesForManagementQuery
      >);

    renderWithQuery(<SpacesManagementPage />);

    expect(await screen.findByText('Engineering')).toBeInTheDocument();
  });

  it('does not render bulk action UI', () => {
    jest
      .spyOn(queries, 'useGetOrganizationSpacesForManagementQuery')
      .mockReturnValue({
        data: { items: [], totalCount: 0, page: 1, pageSize: 8 },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<
        typeof queries.useGetOrganizationSpacesForManagementQuery
      >);

    renderWithQuery(<SpacesManagementPage />);

    expect(screen.queryByTestId('spaces-bulk-action-bar')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /select/i })).toBeNull();
  });

  it('opens the drawer when a row is clicked', async () => {
    mockDrawerDependencies();
    jest
      .spyOn(queries, 'useGetOrganizationSpacesForManagementQuery')
      .mockReturnValue({
        data: {
          items: [buildItem({ name: 'Frontend' })],
          totalCount: 1,
          page: 1,
          pageSize: 8,
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<
        typeof queries.useGetOrganizationSpacesForManagementQuery
      >);

    renderWithQuery(<SpacesManagementPage />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Frontend'));

    expect(
      await screen.findByRole('heading', { name: 'Frontend' }),
    ).toBeInTheDocument();
  });

  it('closes the drawer when the close button is clicked', async () => {
    mockDrawerDependencies();
    jest
      .spyOn(queries, 'useGetOrganizationSpacesForManagementQuery')
      .mockReturnValue({
        data: {
          items: [buildItem({ name: 'Frontend' })],
          totalCount: 1,
          page: 1,
          pageSize: 8,
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<
        typeof queries.useGetOrganizationSpacesForManagementQuery
      >);

    renderWithQuery(<SpacesManagementPage />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Frontend'));

    expect(
      await screen.findByRole('heading', { name: 'Frontend' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByRole('heading', { name: 'Frontend' })).toBeNull();
  });
});
