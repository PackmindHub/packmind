import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import type { UserId, UserOrganizationRole } from '@packmind/types';
import { createSpaceId } from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';

import * as AuthContextModule from '../../accounts/hooks/useAuthContext';
import {
  useGetSpaceMembersQuery,
  useRemoveMemberFromSpaceMutation,
  useUpdateMemberRoleMutation,
} from '../api/queries/SpacesQueries';
import { SpaceMembersList } from './SpaceMembersList';

jest.mock('../api/queries/SpacesQueries', () => ({
  ...jest.requireActual('../api/queries/SpacesQueries'),
  useGetSpaceMembersQuery: jest.fn(),
  useRemoveMemberFromSpaceMutation: jest.fn(),
  useUpdateMemberRoleMutation: jest.fn(),
}));

const mockUseGetSpaceMembersQuery =
  useGetSpaceMembersQuery as jest.MockedFunction<
    typeof useGetSpaceMembersQuery
  >;
const mockUseRemoveMemberFromSpaceMutation =
  useRemoveMemberFromSpaceMutation as jest.MockedFunction<
    typeof useRemoveMemberFromSpaceMutation
  >;
const mockUseUpdateMemberRoleMutation =
  useUpdateMemberRoleMutation as jest.MockedFunction<
    typeof useUpdateMemberRoleMutation
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

  const utils = render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </UIProvider>,
  );

  return { ...utils, queryClient };
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

  let removeMutateMock: jest.Mock;
  let updateRoleMutateMock: jest.Mock;

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

    removeMutateMock = jest.fn(
      (
        _vars: unknown,
        opts?: { onSuccess?: () => void; onSettled?: () => void },
      ) => {
        opts?.onSuccess?.();
        opts?.onSettled?.();
      },
    );
    updateRoleMutateMock = jest.fn(
      (_vars: unknown, opts?: { onSuccess?: () => void }) => {
        opts?.onSuccess?.();
      },
    );

    mockUseRemoveMemberFromSpaceMutation.mockReturnValue({
      mutate: removeMutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof useRemoveMemberFromSpaceMutation>);
    mockUseUpdateMemberRoleMutation.mockReturnValue({
      mutate: updateRoleMutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateMemberRoleMutation>);

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

  it('invalidates the management listing key when a member role is updated', async () => {
    const { queryClient } = renderWithProviders(
      <SpaceMembersList space={space} isSpaceAdmin={true} />,
    );
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const roleSelects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const targetSelect = roleSelects.find((s) => !s.disabled);
    expect(targetSelect).toBeDefined();

    await act(async () => {
      fireEvent.change(targetSelect as HTMLSelectElement, {
        target: { value: 'member' },
      });
    });

    expect(updateRoleMutateMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['organizations', 'org-id', 'spaces', 'management'],
      });
    });
  });

  it('invalidates the management listing key when a member is removed', async () => {
    const { queryClient } = renderWithProviders(
      <SpaceMembersList space={space} isSpaceAdmin={true} />,
    );
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const rowRemoveButtons = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('table button'),
    );
    expect(rowRemoveButtons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(rowRemoveButtons[0]);
    });

    const confirmButton = await waitFor(() => {
      const buttons = Array.from(
        document.body.querySelectorAll<HTMLButtonElement>('button'),
      ).filter((btn) => btn.textContent?.trim() === 'Remove');
      expect(buttons.length).toBeGreaterThan(0);
      return buttons[buttons.length - 1];
    });

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(removeMutateMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['organizations', 'org-id', 'spaces', 'management'],
      });
    });
  });
});
