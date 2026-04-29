import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import type { UserId, UserOrganizationRole } from '@packmind/types';
import { createSpaceId } from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';

import * as AuthContextModule from '../../accounts/hooks/useAuthContext';
import { useGetSpaceMembersQuery } from '../api/queries/SpacesQueries';
import { SpaceMembersList } from './SpaceMembersList';

jest.mock('../api/queries/SpacesQueries', () => ({
  ...jest.requireActual('../api/queries/SpacesQueries'),
  useGetSpaceMembersQuery: jest.fn(),
}));

const mockUseGetSpaceMembersQuery =
  useGetSpaceMembersQuery as jest.MockedFunction<
    typeof useGetSpaceMembersQuery
  >;

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
          {data.map((row) => (
            <tr key={row['id'] as string}>
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

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </UIProvider>,
  );
};

describe('SpaceMembersList', () => {
  const mockUser = {
    id: 'current-user-id' as UserId,
    email: 'current.user@test.com',
    memberships: [],
  };

  const mockOrganization = {
    id: 'org-id' as unknown as ReturnType<typeof String>,
    name: 'Test Org',
    slug: 'test-org',
    role: 'admin' as UserOrganizationRole,
  };

  const space = spaceFactory({
    id: createSpaceId('space-1'),
    isDefaultSpace: false,
  });

  beforeEach(() => {
    jest.spyOn(AuthContextModule, 'useAuthContext').mockReturnValue({
      user: mockUser,
      organization: mockOrganization,
      isAuthenticated: true,
      isLoading: false,
      getMe: jest.fn(),
      getUserOrganizations: jest.fn(),
      validateAndSwitchIfNeeded: jest.fn(),
    } as unknown as ReturnType<typeof AuthContextModule.useAuthContext>);

    mockUseGetSpaceMembersQuery.mockReturnValue({
      data: {
        members: [
          {
            userId: 'current-user-id',
            spaceId: 'space-1',
            displayName: 'current.user@test.com',
            role: 'admin',
          },
          {
            userId: '1',
            spaceId: 'space-1',
            displayName: 'john.doe',
            role: 'admin',
          },
          {
            userId: '2',
            spaceId: 'space-1',
            displayName: 'jane.smith',
            role: 'member',
          },
          {
            userId: '3',
            spaceId: 'space-1',
            displayName: 'bob.martin',
            role: 'member',
          },
        ],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSpaceMembersQuery>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the current user in the members list', () => {
    renderWithProviders(<SpaceMembersList space={space} isSpaceAdmin={true} />);

    expect(screen.getByText('current.user@test.com')).toBeInTheDocument();
  });

  it('renders mock members alongside the current user', () => {
    renderWithProviders(<SpaceMembersList space={space} isSpaceAdmin={true} />);

    expect(screen.getByText('john.doe')).toBeInTheDocument();
    expect(screen.getByText('jane.smith')).toBeInTheDocument();
    expect(screen.getByText('bob.martin')).toBeInTheDocument();
  });

  it('marks the current user with "You" badge', () => {
    renderWithProviders(<SpaceMembersList space={space} isSpaceAdmin={true} />);

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('when isSpaceAdmin is false, hides the Add button and disables remove/role controls', () => {
    renderWithProviders(
      <SpaceMembersList space={space} isSpaceAdmin={false} />,
    );

    expect(screen.queryByRole('button', { name: /add members/i })).toBeNull();

    const roleSelects = screen.getAllByRole('combobox');
    roleSelects.forEach((select) => {
      expect(select).toBeDisabled();
    });

    expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
  });
});
