import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { SpaceType } from '@packmind/types';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import { useCreateSpaceMutation } from '../api/queries/SpacesManagementQueries';

jest.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    organization: {
      id: 'org-1',
      name: 'Test Organization',
      slug: 'test-org',
    },
  }),
}));

jest.mock('../api/queries/SpacesManagementQueries', () => ({
  ...jest.requireActual('../api/queries/SpacesManagementQueries'),
  useCreateSpaceMutation: jest.fn(),
}));

const mockUseCreateSpaceMutation =
  useCreateSpaceMutation as jest.MockedFunction<typeof useCreateSpaceMutation>;

const createMockMutation = (overrides = {}) =>
  ({
    mutate: jest.fn(),
    mutateAsync: jest
      .fn()
      .mockResolvedValue({ name: 'My Space', slug: 'my-space' }),
    isPending: false,
    isSuccess: false,
    isError: false,
    ...overrides,
  }) as unknown as ReturnType<typeof useCreateSpaceMutation>;

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
};

describe('CreateSpaceDialog', () => {
  const defaultProps = {
    open: true,
    setOpen: jest.fn(),
  };

  beforeEach(() => {
    mockUseCreateSpaceMutation.mockReturnValue(createMockMutation());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the dialog is open', () => {
    it('renders all three access status options with descriptions', () => {
      renderWithProviders(<CreateSpaceDialog {...defaultProps} />);

      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Anyone can join')).toBeInTheDocument();
      expect(screen.getByText('Restricted')).toBeInTheDocument();
      expect(screen.getByText('Approval required to join')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
      expect(screen.getByText('Invite only')).toBeInTheDocument();
    });

    it('selects open as default access status', () => {
      renderWithProviders(<CreateSpaceDialog {...defaultProps} />);

      const openRadio = screen.getByRole('radio', { name: /open/i });
      expect(openRadio).toBeChecked();
    });

    it('does not select restricted or private by default', () => {
      renderWithProviders(<CreateSpaceDialog {...defaultProps} />);

      const restrictedRadio = screen.getByRole('radio', {
        name: /restricted/i,
      });
      const privateRadio = screen.getByRole('radio', { name: /private/i });

      expect(restrictedRadio).not.toBeChecked();
      expect(privateRadio).not.toBeChecked();
    });
  });

  describe('when submitting with the default type', () => {
    it('sends open type to the mutation', async () => {
      const mockMutateAsync = jest
        .fn()
        .mockResolvedValue({ name: 'My Space', slug: 'my-space' });
      mockUseCreateSpaceMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );

      renderWithProviders(<CreateSpaceDialog {...defaultProps} />);

      const input = screen.getByTestId('create-space-name-input');
      fireEvent.change(input, { target: { value: 'My Space' } });

      const submitButton = screen.getByTestId('create-space-submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'My Space',
          type: SpaceType.open,
        });
      });
    });
  });

  describe('when selecting restricted type before submitting', () => {
    it('sends restricted type to the mutation', async () => {
      const mockMutateAsync = jest
        .fn()
        .mockResolvedValue({ name: 'My Space', slug: 'my-space' });
      mockUseCreateSpaceMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );

      renderWithProviders(<CreateSpaceDialog {...defaultProps} />);

      const input = screen.getByTestId('create-space-name-input');
      fireEvent.change(input, { target: { value: 'My Space' } });

      await act(async () => {
        const restrictedRadio = screen.getByRole('radio', {
          name: /restricted/i,
        });
        fireEvent.click(restrictedRadio);
      });

      await act(async () => {
        const submitButton = screen.getByTestId('create-space-submit');
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'My Space',
          type: SpaceType.restricted,
        });
      });
    });
  });

  describe('when selecting private type before submitting', () => {
    it('sends private type to the mutation', async () => {
      const mockMutateAsync = jest
        .fn()
        .mockResolvedValue({ name: 'My Space', slug: 'my-space' });
      mockUseCreateSpaceMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );

      renderWithProviders(<CreateSpaceDialog {...defaultProps} />);

      const input = screen.getByTestId('create-space-name-input');
      fireEvent.change(input, { target: { value: 'My Space' } });

      await act(async () => {
        const privateRadio = screen.getByRole('radio', { name: /private/i });
        fireEvent.click(privateRadio);
      });

      await act(async () => {
        const submitButton = screen.getByTestId('create-space-submit');
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'My Space',
          type: SpaceType.private,
        });
      });
    });
  });
});
