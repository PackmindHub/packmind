import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createRecipeId,
  ChangeProposalType,
  ChangeProposalCaptureMode,
} from '@packmind/types';
import { ProposeChangeModal } from './ProposeChangeModal';
import { useCreateChangeProposalMutation } from '../../change-proposals/api/queries/ChangeProposalsQueries';

jest.mock('../../change-proposals/api/queries/ChangeProposalsQueries', () => ({
  useCreateChangeProposalMutation: jest.fn(),
}));

const mockUseCreateChangeProposalMutation =
  useCreateChangeProposalMutation as jest.MockedFunction<
    typeof useCreateChangeProposalMutation
  >;

const createMockMutation = (overrides = {}) =>
  ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    ...overrides,
  }) as unknown as ReturnType<typeof useCreateChangeProposalMutation>;

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

describe('ProposeChangeModal', () => {
  const organizationId = createOrganizationId();
  const recipeId = createRecipeId();
  const defaultProps = {
    recipeName: 'My Command',
    recipeId,
    organizationId,
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    mockUseCreateChangeProposalMutation.mockReturnValue(createMockMutation());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when open', () => {
    it('renders the modal with title', () => {
      renderWithProviders(<ProposeChangeModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders the input pre-filled with current recipe name', () => {
      renderWithProviders(<ProposeChangeModal {...defaultProps} />);

      const input = screen.getByDisplayValue('My Command');

      expect(input).toBeInTheDocument();
    });

    it('renders the Submit proposal button', () => {
      renderWithProviders(<ProposeChangeModal {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Submit proposal' }),
      ).toBeInTheDocument();
    });
  });

  describe('when name has not changed', () => {
    it('disables the Submit proposal button', () => {
      renderWithProviders(<ProposeChangeModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', {
        name: 'Submit proposal',
      });

      expect(submitButton).toBeDisabled();
    });

    it('does not call mutation when clicked', async () => {
      const mockMutate = jest.fn();
      mockUseCreateChangeProposalMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }),
      );
      renderWithProviders(<ProposeChangeModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', {
        name: 'Submit proposal',
      });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('when name has changed', () => {
    it('enables the Submit proposal button', async () => {
      renderWithProviders(<ProposeChangeModal {...defaultProps} />);

      const input = screen.getByDisplayValue('My Command');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'New Command Name' } });
      });

      const submitButton = screen.getByRole('button', {
        name: 'Submit proposal',
      });

      expect(submitButton).not.toBeDisabled();
    });

    it('calls mutation with correct payload on submit', async () => {
      const mockMutate = jest.fn();
      mockUseCreateChangeProposalMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }),
      );
      renderWithProviders(<ProposeChangeModal {...defaultProps} />);

      const input = screen.getByDisplayValue('My Command');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'New Command Name' } });
      });

      const submitButton = screen.getByRole('button', {
        name: 'Submit proposal',
      });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(mockMutate).toHaveBeenCalledWith(
        {
          organizationId,
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          payload: { oldValue: 'My Command', newValue: 'New Command Name' },
          captureMode: ChangeProposalCaptureMode.commit,
        },
        expect.any(Object),
      );
    });

    describe('when mutation succeeds', () => {
      it('closes the modal', async () => {
        const onOpenChange = jest.fn();
        const mockMutate = jest.fn();
        mockUseCreateChangeProposalMutation.mockReturnValue(
          createMockMutation({ mutate: mockMutate }),
        );
        renderWithProviders(
          <ProposeChangeModal {...defaultProps} onOpenChange={onOpenChange} />,
        );

        const input = screen.getByDisplayValue('My Command');
        await act(async () => {
          fireEvent.change(input, { target: { value: 'New Command Name' } });
        });

        const submitButton = screen.getByRole('button', {
          name: 'Submit proposal',
        });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        const mutateCall = mockMutate.mock.calls[0];
        const onSuccess = mutateCall[1].onSuccess;
        await act(async () => {
          onSuccess();
        });

        expect(onOpenChange).toHaveBeenCalledWith({ open: false });
      });
    });

    describe('when mutation fails', () => {
      it('shows an error message', async () => {
        const mockMutate = jest.fn();
        mockUseCreateChangeProposalMutation.mockReturnValue(
          createMockMutation({ mutate: mockMutate }),
        );
        renderWithProviders(<ProposeChangeModal {...defaultProps} />);

        const input = screen.getByDisplayValue('My Command');
        await act(async () => {
          fireEvent.change(input, { target: { value: 'New Command Name' } });
        });

        const submitButton = screen.getByRole('button', {
          name: 'Submit proposal',
        });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        const mutateCall = mockMutate.mock.calls[0];
        const onError = mutateCall[1].onError;
        await act(async () => {
          onError(new Error('API error'));
        });

        await waitFor(() => {
          expect(
            screen.getByText(
              'Failed to submit change proposal. Please refresh the page and try again.',
            ),
          ).toBeInTheDocument();
        });
      });

      it('keeps the modal open', async () => {
        const onOpenChange = jest.fn();
        const mockMutate = jest.fn();
        mockUseCreateChangeProposalMutation.mockReturnValue(
          createMockMutation({ mutate: mockMutate }),
        );
        renderWithProviders(
          <ProposeChangeModal {...defaultProps} onOpenChange={onOpenChange} />,
        );

        const input = screen.getByDisplayValue('My Command');
        await act(async () => {
          fireEvent.change(input, { target: { value: 'New Command Name' } });
        });

        const submitButton = screen.getByRole('button', {
          name: 'Submit proposal',
        });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        const mutateCall = mockMutate.mock.calls[0];
        const onError = mutateCall[1].onError;
        await act(async () => {
          onError(new Error('API error'));
        });

        expect(onOpenChange).not.toHaveBeenCalledWith({ open: false });
      });
    });
  });

  describe('when clicking Cancel button', () => {
    it('calls onOpenChange to close', async () => {
      const onOpenChange = jest.fn();
      renderWithProviders(
        <ProposeChangeModal {...defaultProps} onOpenChange={onOpenChange} />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(onOpenChange).toHaveBeenCalledWith({ open: false });
    });
  });

  describe('when closed', () => {
    it('does not render the modal content', () => {
      renderWithProviders(
        <ProposeChangeModal {...defaultProps} open={false} />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
