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
  createSpaceId,
  ChangeProposalType,
  ChangeProposalCaptureMode,
} from '@packmind/types';
import { ProposeDescriptionChangeModal } from './ProposeDescriptionChangeModal';
import { useCreateChangeProposalMutation } from '../../change-proposals/api/queries/ChangeProposalsQueries';

let mockOnMarkdownChange: ((value: string) => void) | undefined;

jest.mock('../../../shared/components/editor/MarkdownEditor', () => ({
  MarkdownEditor: ({
    defaultValue,
    onMarkdownChange,
  }: {
    defaultValue: string;
    onMarkdownChange?: (value: string) => void;
  }) => {
    mockOnMarkdownChange = onMarkdownChange;
    return (
      <textarea
        data-testid="markdown-editor"
        defaultValue={defaultValue}
        onChange={(e) => onMarkdownChange?.(e.target.value)}
      />
    );
  },
  MarkdownEditorProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

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

describe('ProposeDescriptionChangeModal', () => {
  const organizationId = createOrganizationId();
  const spaceId = createSpaceId();
  const recipeId = createRecipeId();
  const defaultProps = {
    recipeDescription: '# Original description',
    recipeId,
    organizationId,
    spaceId,
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    mockOnMarkdownChange = undefined;
    mockUseCreateChangeProposalMutation.mockReturnValue(createMockMutation());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when open', () => {
    it('renders the modal with title', () => {
      renderWithProviders(<ProposeDescriptionChangeModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders the markdown editor with current description', () => {
      renderWithProviders(<ProposeDescriptionChangeModal {...defaultProps} />);

      const editor = screen.getByTestId('markdown-editor');

      expect(editor).toHaveValue('# Original description');
    });

    it('renders the Submit proposal button', () => {
      renderWithProviders(<ProposeDescriptionChangeModal {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Submit proposal' }),
      ).toBeInTheDocument();
    });
  });

  describe('when description has not changed', () => {
    it('disables the Submit proposal button', () => {
      renderWithProviders(<ProposeDescriptionChangeModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', {
        name: 'Submit proposal',
      });

      expect(submitButton).toBeDisabled();
    });
  });

  describe('when description has changed', () => {
    it('enables the Submit proposal button', async () => {
      renderWithProviders(<ProposeDescriptionChangeModal {...defaultProps} />);

      const editor = screen.getByTestId('markdown-editor');
      await act(async () => {
        fireEvent.change(editor, {
          target: { value: '# Updated description' },
        });
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
      renderWithProviders(<ProposeDescriptionChangeModal {...defaultProps} />);

      const editor = screen.getByTestId('markdown-editor');
      await act(async () => {
        fireEvent.change(editor, {
          target: { value: '# Updated description' },
        });
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
          spaceId,
          type: ChangeProposalType.updateCommandDescription,
          artefactId: recipeId,
          payload: {
            oldValue: '# Original description',
            newValue: '# Updated description',
          },
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
          <ProposeDescriptionChangeModal
            {...defaultProps}
            onOpenChange={onOpenChange}
          />,
        );

        const editor = screen.getByTestId('markdown-editor');
        await act(async () => {
          fireEvent.change(editor, {
            target: { value: '# Updated description' },
          });
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
        renderWithProviders(
          <ProposeDescriptionChangeModal {...defaultProps} />,
        );

        const editor = screen.getByTestId('markdown-editor');
        await act(async () => {
          fireEvent.change(editor, {
            target: { value: '# Updated description' },
          });
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
          <ProposeDescriptionChangeModal
            {...defaultProps}
            onOpenChange={onOpenChange}
          />,
        );

        const editor = screen.getByTestId('markdown-editor');
        await act(async () => {
          fireEvent.change(editor, {
            target: { value: '# Updated description' },
          });
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
        <ProposeDescriptionChangeModal
          {...defaultProps}
          onOpenChange={onOpenChange}
        />,
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
        <ProposeDescriptionChangeModal {...defaultProps} open={false} />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
