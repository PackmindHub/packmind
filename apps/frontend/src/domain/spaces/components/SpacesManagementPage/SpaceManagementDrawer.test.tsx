import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  SpaceType,
  createOrganizationId,
  createSpaceId,
  type SpaceManagementListItem,
  type UserId,
  type UserOrganizationRole,
} from '@packmind/types';

import * as AuthContextModule from '../../../accounts/hooks/useAuthContext';
import * as SpacesQueriesModule from '../../api/queries/SpacesQueries';
import * as SpacesManagementQueriesModule from '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries';
import * as DeploymentsQueriesModule from '../../../deployments/api/queries/DeploymentsQueries';
import * as UseNavigationModule from '../../../../shared/hooks/useNavigation';
import * as UserQueriesModule from '../../../accounts/api/queries/UserQueries';
import { SpaceManagementDrawer } from './SpaceManagementDrawer';

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

const mockUser = {
  id: 'current-user-id' as UserId,
  email: 'current.user@test.com',
  displayName: 'Current User',
  memberships: [],
};

const buildOrganization = (
  role: UserOrganizationRole = 'admin' as UserOrganizationRole,
) => ({
  id: createOrganizationId('org-1'),
  name: 'Test Org',
  slug: 'test-org',
  role,
});

const buildSpace = (
  overrides: Partial<SpaceManagementListItem> = {},
): SpaceManagementListItem => ({
  id: createSpaceId('s-1'),
  name: 'Frontend',
  slug: 'frontend',
  color: 'orange',
  type: SpaceType.open,
  organizationId: createOrganizationId('org-1'),
  isDefaultSpace: false,
  admins: [],
  membersCount: 3,
  artifactsCount: 7,
  ...overrides,
});

const mockAuthContext = (
  role: UserOrganizationRole = 'admin' as UserOrganizationRole,
) => {
  jest.spyOn(AuthContextModule, 'useAuthContext').mockReturnValue({
    user: mockUser,
    organization: buildOrganization(role),
    isAuthenticated: true,
    isLoading: false,
    getMe: jest.fn(),
    getUserOrganizations: jest.fn(),
    validateAndSwitchIfNeeded: jest.fn(),
  } as unknown as ReturnType<typeof AuthContextModule.useAuthContext>);
};

const mockGetSpaceMembers = (
  members: Array<{
    userId: string;
    spaceId: string;
    displayName: string;
    role: 'admin' | 'member';
  }> = [],
) => {
  jest.spyOn(SpacesQueriesModule, 'useGetSpaceMembersQuery').mockReturnValue({
    data: { members },
    isLoading: false,
  } as unknown as ReturnType<
    typeof SpacesQueriesModule.useGetSpaceMembersQuery
  >);
};

const mockMemberMutations = () => {
  jest
    .spyOn(SpacesQueriesModule, 'useRemoveMemberFromSpaceMutation')
    .mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<
      typeof SpacesQueriesModule.useRemoveMemberFromSpaceMutation
    >);

  jest
    .spyOn(SpacesQueriesModule, 'useUpdateMemberRoleMutation')
    .mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<
      typeof SpacesQueriesModule.useUpdateMemberRoleMutation
    >);
};

const mockSpaceManagementMutations = () => {
  jest
    .spyOn(SpacesManagementQueriesModule, 'useUpdateSpaceMutation')
    .mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<
      typeof SpacesManagementQueriesModule.useUpdateSpaceMutation
    >);

  jest
    .spyOn(SpacesManagementQueriesModule, 'useLeaveSpaceMutation')
    .mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<
      typeof SpacesManagementQueriesModule.useLeaveSpaceMutation
    >);

  jest
    .spyOn(SpacesManagementQueriesModule, 'useDeleteSpaceMutation')
    .mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<
      typeof SpacesManagementQueriesModule.useDeleteSpaceMutation
    >);
};

const mockListPackages = () => {
  jest
    .spyOn(DeploymentsQueriesModule, 'useListPackagesBySpaceQuery')
    .mockReturnValue({
      data: { packages: [] },
    } as unknown as ReturnType<
      typeof DeploymentsQueriesModule.useListPackagesBySpaceQuery
    >);
};

const mockNavigation = () => {
  jest.spyOn(UseNavigationModule, 'useNavigation').mockReturnValue({
    org: { toDashboard: jest.fn() },
  } as unknown as ReturnType<typeof UseNavigationModule.useNavigation>);
};

const mockUsersInOrg = () => {
  jest
    .spyOn(UserQueriesModule, 'useGetUsersInMyOrganizationQuery')
    .mockReturnValue({
      data: { users: [] },
      isLoading: false,
    } as unknown as ReturnType<
      typeof UserQueriesModule.useGetUsersInMyOrganizationQuery
    >);
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{component}</MemoryRouter>
      </QueryClientProvider>
    </UIProvider>,
  );
};

describe('SpaceManagementDrawer', () => {
  beforeEach(() => {
    mockAuthContext('admin' as UserOrganizationRole);
    mockGetSpaceMembers();
    mockMemberMutations();
    mockSpaceManagementMutations();
    mockListPackages();
    mockNavigation();
    mockUsersInOrg();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not render the drawer dialog when space is null', () => {
    renderWithProviders(
      <SpaceManagementDrawer space={null} onClose={jest.fn()} />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders three tabs for a non-default space', () => {
    renderWithProviders(
      <SpaceManagementDrawer space={buildSpace()} onClose={jest.fn()} />,
    );

    expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /members/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /danger/i })).toBeInTheDocument();
  });

  it('omits the Danger tab for the default space', () => {
    renderWithProviders(
      <SpaceManagementDrawer
        space={buildSpace({ isDefaultSpace: true })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /members/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /danger/i })).toBeNull();
  });

  it('renders the space name in the header', () => {
    renderWithProviders(
      <SpaceManagementDrawer
        space={buildSpace({ name: 'Engineering' })}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Engineering' }),
    ).toBeInTheDocument();
  });

  it('renders the header subtitle with member and artifact counts', () => {
    renderWithProviders(
      <SpaceManagementDrawer
        space={buildSpace({ membersCount: 5, artifactsCount: 12 })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText(/5 members/)).toBeInTheDocument();
    expect(screen.getByText(/12 artifacts/)).toBeInTheDocument();
  });

  it('uses singular form when counts equal 1', () => {
    renderWithProviders(
      <SpaceManagementDrawer
        space={buildSpace({ membersCount: 1, artifactsCount: 1 })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText(/1 member(?!s)/)).toBeInTheDocument();
    expect(screen.getByText(/1 artifact(?!s)/)).toBeInTheDocument();
  });

  it('grants edit when current user is org admin', () => {
    renderWithProviders(
      <SpaceManagementDrawer space={buildSpace()} onClose={jest.fn()} />,
    );

    expect(screen.queryByText(/Read-only access/i)).toBeNull();
  });

  it('denies edit when user is org member and not space admin', () => {
    mockAuthContext('member' as UserOrganizationRole);

    renderWithProviders(
      <SpaceManagementDrawer space={buildSpace()} onClose={jest.fn()} />,
    );

    expect(screen.getByText(/Read-only access/i)).toBeInTheDocument();
  });

  it('grants edit when user is space admin even if org member', () => {
    mockAuthContext('member' as UserOrganizationRole);
    mockGetSpaceMembers([
      {
        userId: 'current-user-id',
        spaceId: 's-1',
        displayName: 'current.user@test.com',
        role: 'admin',
      },
    ]);

    renderWithProviders(
      <SpaceManagementDrawer space={buildSpace()} onClose={jest.fn()} />,
    );

    expect(screen.queryByText(/Read-only access/i)).toBeNull();
  });
});
