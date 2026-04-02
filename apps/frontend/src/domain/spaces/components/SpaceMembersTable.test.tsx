import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';

import { SpaceMember, SpaceMembersTable } from './SpaceMembersTable';

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

const members: SpaceMember[] = [
  { id: 'user-1', displayName: 'alice.smith', role: 'admin' },
  { id: 'user-2', displayName: 'bob.jones', role: 'member' },
  { id: 'user-3', displayName: 'carol.white', role: 'admin' },
];

describe('SpaceMembersTable', () => {
  it('renders all members', () => {
    renderWithProviders(<SpaceMembersTable members={members} />);

    expect(screen.getByText('alice.smith')).toBeInTheDocument();
    expect(screen.getByText('bob.jones')).toBeInTheDocument();
    expect(screen.getByText('carol.white')).toBeInTheDocument();
  });

  it('renders a role select for each member', () => {
    renderWithProviders(<SpaceMembersTable members={members} />);

    const selects = screen.getAllByRole('combobox');

    expect(selects).toHaveLength(3);
  });

  it('renders a remove button for each member when user is space admin', () => {
    renderWithProviders(
      <SpaceMembersTable members={members} isSpaceAdmin={true} />,
    );

    const removeButtons = screen.getAllByRole('button');

    expect(removeButtons).toHaveLength(3);
  });

  it('does not render remove buttons when user is not space admin', () => {
    renderWithProviders(
      <SpaceMembersTable members={members} isSpaceAdmin={false} />,
    );

    const removeButtons = screen.queryAllByRole('button');

    expect(removeButtons).toHaveLength(0);
  });

  it('does not render remove buttons for default space', () => {
    renderWithProviders(
      <SpaceMembersTable
        members={members}
        isSpaceAdmin={true}
        isDefaultSpace={true}
      />,
    );

    const removeButtons = screen.queryAllByRole('button');

    expect(removeButtons).toHaveLength(0);
  });

  describe('when currentUserId matches a member', () => {
    it('displays "You" badge for the current user', () => {
      renderWithProviders(
        <SpaceMembersTable members={members} currentUserId="user-1" />,
      );

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('disables the role select for the current user', () => {
      renderWithProviders(
        <SpaceMembersTable members={members} currentUserId="user-1" />,
      );

      const selects = screen.getAllByRole('combobox');
      const disabledSelect = selects.find((s) => s.hasAttribute('disabled'));

      expect(disabledSelect).toBeInTheDocument();
    });

    it('does not render a remove button for the current user', () => {
      renderWithProviders(
        <SpaceMembersTable
          members={members}
          currentUserId="user-1"
          isSpaceAdmin={true}
        />,
      );

      const removeButtons = screen.getAllByRole('button');

      expect(removeButtons).toHaveLength(2);
    });

    it('still renders selects and remove buttons for other members', () => {
      renderWithProviders(
        <SpaceMembersTable members={members} currentUserId="user-1" />,
      );

      expect(screen.getByText('bob.jones')).toBeInTheDocument();
      expect(screen.getByText('carol.white')).toBeInTheDocument();
    });
  });

  describe('when onRemoveMember is provided', () => {
    describe('when remove button is clicked', () => {
      it('calls onRemoveMember with the member id', async () => {
        const onRemoveMember = jest.fn();

        renderWithProviders(
          <SpaceMembersTable
            members={members}
            isSpaceAdmin={true}
            onRemoveMember={onRemoveMember}
          />,
        );

        const removeButtons = screen.getAllByRole('button');
        await userEvent.click(removeButtons[0]);

        expect(onRemoveMember).toHaveBeenCalledWith('user-1');
      });
    });
  });

  describe('when onUpdateMemberRole is provided', () => {
    describe('when role select is changed by a space admin', () => {
      it('calls onUpdateMemberRole', async () => {
        const onUpdateMemberRole = jest.fn();

        renderWithProviders(
          <SpaceMembersTable
            members={members}
            isSpaceAdmin={true}
            onUpdateMemberRole={onUpdateMemberRole}
          />,
        );

        const selects = screen.getAllByRole('combobox');
        await userEvent.selectOptions(selects[1], 'admin');

        expect(onUpdateMemberRole).toHaveBeenCalledWith('user-2', 'admin');
      });
    });
  });

  describe('when user is not a space admin', () => {
    it('disables all role selects', () => {
      renderWithProviders(
        <SpaceMembersTable members={members} isSpaceAdmin={false} />,
      );

      const selects = screen.getAllByRole('combobox');

      expect(selects.every((s) => s.hasAttribute('disabled'))).toBe(true);
    });
  });
});
