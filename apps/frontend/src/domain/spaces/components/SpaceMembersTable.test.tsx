import React from 'react';
import { render, screen } from '@testing-library/react';
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

  it('renders a remove button for each member', () => {
    renderWithProviders(<SpaceMembersTable members={members} />);

    const removeButtons = screen.getAllByRole('button');

    expect(removeButtons).toHaveLength(3);
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
        <SpaceMembersTable members={members} currentUserId="user-1" />,
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
});
