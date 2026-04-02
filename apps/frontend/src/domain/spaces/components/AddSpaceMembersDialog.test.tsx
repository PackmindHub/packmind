import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';

import { AddSpaceMembersDialog } from './AddSpaceMembersDialog';
import { useAddMembersToSpaceMutation } from '../api/queries/SpacesQueries';
import { useGetUsersInMyOrganizationQuery } from '../../accounts/api/queries/UserQueries';
import { SpaceMember } from './SpaceMembersTable';

jest.mock('../api/queries/SpacesQueries', () => ({
  ...jest.requireActual('../api/queries/SpacesQueries'),
  useAddMembersToSpaceMutation: jest.fn(),
}));

jest.mock('../../accounts/api/queries/UserQueries', () => ({
  ...jest.requireActual('../../accounts/api/queries/UserQueries'),
  useGetUsersInMyOrganizationQuery: jest.fn(),
}));

const mockUseGetUsersInMyOrganizationQuery =
  useGetUsersInMyOrganizationQuery as jest.MockedFunction<
    typeof useGetUsersInMyOrganizationQuery
  >;

const mockUseAddMembersToSpaceMutation =
  useAddMembersToSpaceMutation as jest.MockedFunction<
    typeof useAddMembersToSpaceMutation
  >;

const createMockMutation = (overrides = {}) =>
  ({
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue({ memberships: [] }),
    isPending: false,
    isSuccess: false,
    isError: false,
    ...overrides,
  }) as unknown as ReturnType<typeof useAddMembersToSpaceMutation>;

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
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

describe('AddSpaceMembersDialog', () => {
  const existingMembers: SpaceMember[] = [
    { id: '10', displayName: 'alice.wilson', role: 'admin' },
  ];

  const defaultProps = {
    open: true,
    setOpen: jest.fn(),
    spaceId: 'space-id-1',
    existingMembers: [] as SpaceMember[],
  };

  beforeEach(() => {
    mockUseAddMembersToSpaceMutation.mockReturnValue(createMockMutation());
    mockUseGetUsersInMyOrganizationQuery.mockReturnValue({
      data: {
        users: [
          { userId: '10', displayName: 'alice.wilson', role: 'member' },
          { userId: '11', displayName: 'charlie.brown', role: 'member' },
          { userId: '12', displayName: 'diana.prince', role: 'member' },
          { userId: '13', displayName: 'edward.norton', role: 'member' },
          { userId: '14', displayName: 'fiona.apple', role: 'member' },
        ],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetUsersInMyOrganizationQuery>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dialog title', () => {
    renderWithProviders(<AddSpaceMembersDialog {...defaultProps} />);

    expect(screen.getByText('Add members to space')).toBeInTheDocument();
  });

  it('renders the combobox with placeholder', () => {
    renderWithProviders(<AddSpaceMembersDialog {...defaultProps} />);

    expect(
      screen.getByPlaceholderText('e.g., alice.wilson'),
    ).toBeInTheDocument();
  });

  it('disables the add button when no members are selected', () => {
    renderWithProviders(<AddSpaceMembersDialog {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /add.*members/i });

    expect(addButton).toBeDisabled();
  });

  describe('when an existing member is in the space', () => {
    it('excludes the existing member from the combobox items', () => {
      renderWithProviders(
        <AddSpaceMembersDialog
          {...defaultProps}
          existingMembers={existingMembers}
        />,
      );

      const input = screen.getByPlaceholderText('e.g., alice.wilson');
      fireEvent.click(input);
      fireEvent.change(input, { target: { value: 'alice' } });

      expect(screen.queryByText('alice.wilson')).not.toBeInTheDocument();
    });
  });

  describe('when a user is selected from the combobox', () => {
    const selectUser = (displayName: string) => {
      const input = screen.getByPlaceholderText('e.g., alice.wilson');
      fireEvent.click(input);
      fireEvent.change(input, { target: { value: displayName } });

      const option = screen.getByText(displayName);
      fireEvent.click(option);
    };

    it('displays the selected user in the members list', async () => {
      renderWithProviders(<AddSpaceMembersDialog {...defaultProps} />);

      selectUser('charlie.brown');

      await waitFor(() => {
        expect(screen.getByText('charlie.brown')).toBeInTheDocument();
      });
    });

    it('shows a role selector defaulting to Member', async () => {
      renderWithProviders(<AddSpaceMembersDialog {...defaultProps} />);

      selectUser('charlie.brown');

      await waitFor(() => {
        const roleSelect = screen.getByDisplayValue('Member');
        expect(roleSelect).toBeInTheDocument();
      });
    });

    it('shows a remove button for the selected user', async () => {
      renderWithProviders(<AddSpaceMembersDialog {...defaultProps} />);

      selectUser('charlie.brown');

      await waitFor(() => {
        const removeButtons = screen.getAllByRole('button').filter((btn) => {
          const svg = btn.querySelector('svg');
          return svg !== null;
        });
        expect(removeButtons.length).toBeGreaterThan(0);
      });
    });

    it('enables the add button', async () => {
      renderWithProviders(<AddSpaceMembersDialog {...defaultProps} />);

      selectUser('charlie.brown');

      await waitFor(() => {
        const addButton = screen.getByRole('button', {
          name: /add 1 member$/i,
        });
        expect(addButton).not.toBeDisabled();
      });
    });

    describe('when the role is changed to Admin', () => {
      it('updates the role selector value', async () => {
        renderWithProviders(<AddSpaceMembersDialog {...defaultProps} />);

        selectUser('charlie.brown');

        await waitFor(() => {
          expect(screen.getByDisplayValue('Member')).toBeInTheDocument();
        });

        const roleSelect = screen.getByDisplayValue('Member');
        fireEvent.change(roleSelect, { target: { value: 'admin' } });

        expect(screen.getByDisplayValue('Admin')).toBeInTheDocument();
      });
    });

    describe('when the add button is clicked', () => {
      it('calls the mutation with selected members', async () => {
        const mockMutateAsync = jest
          .fn()
          .mockResolvedValue({ memberships: [] });
        mockUseAddMembersToSpaceMutation.mockReturnValue(
          createMockMutation({ mutateAsync: mockMutateAsync }),
        );

        renderWithProviders(<AddSpaceMembersDialog {...defaultProps} />);

        selectUser('charlie.brown');
        await screen.findByText('charlie.brown');

        const addButton = screen.getByRole('button', {
          name: /add 1 member$/i,
        });
        fireEvent.click(addButton);

        await waitFor(() => {
          expect(mockMutateAsync).toHaveBeenCalledWith([
            { userId: '11', role: 'member' },
          ]);
        });
      });

      it('closes the dialog on success', async () => {
        const mockSetOpen = jest.fn();
        const mockMutateAsync = jest
          .fn()
          .mockResolvedValue({ memberships: [] });
        mockUseAddMembersToSpaceMutation.mockReturnValue(
          createMockMutation({ mutateAsync: mockMutateAsync }),
        );

        renderWithProviders(
          <AddSpaceMembersDialog {...defaultProps} setOpen={mockSetOpen} />,
        );

        selectUser('charlie.brown');
        await screen.findByText('charlie.brown');

        const addButton = screen.getByRole('button', {
          name: /add 1 member$/i,
        });
        fireEvent.click(addButton);

        await waitFor(() => {
          expect(mockSetOpen).toHaveBeenCalledWith(false);
        });
      });
    });
  });

  describe('when the dialog is closed', () => {
    it('resets the selected members', () => {
      const mockSetOpen = jest.fn();
      const { rerender } = renderWithProviders(
        <AddSpaceMembersDialog
          {...defaultProps}
          open={true}
          setOpen={mockSetOpen}
        />,
      );

      rerender(
        <UIProvider>
          <QueryClientProvider
            client={
              new QueryClient({
                defaultOptions: { queries: { retry: false } },
              })
            }
          >
            <AddSpaceMembersDialog
              {...defaultProps}
              open={false}
              setOpen={mockSetOpen}
            />
          </QueryClientProvider>
        </UIProvider>,
      );

      expect(
        screen.queryByRole('button', { name: /add \d+ member/i }),
      ).not.toBeInTheDocument();
    });
  });
});
