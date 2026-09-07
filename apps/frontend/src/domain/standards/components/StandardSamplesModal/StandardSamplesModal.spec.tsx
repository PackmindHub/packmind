import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { StandardSamplesModal } from './StandardSamplesModal';
import { useCreateStandardsFromSamplesMutation } from '../../api/queries/StandardsQueries';
import type { Mock, MockedFunction } from 'vitest';

vi.mock('../../api/queries/StandardsQueries', () => ({
  useCreateStandardsFromSamplesMutation: vi.fn(),
}));

const mockUseCreateStandardsFromSamplesMutation =
  useCreateStandardsFromSamplesMutation as MockedFunction<
    typeof useCreateStandardsFromSamplesMutation
  >;

const createMockMutation = (overrides = {}) =>
  ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    ...overrides,
  }) as unknown as ReturnType<typeof useCreateStandardsFromSamplesMutation>;

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

describe('StandardSamplesModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    mockUseCreateStandardsFromSamplesMutation.mockReturnValue(
      createMockMutation(),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when open', () => {
    it('renders the modal with title', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders Languages section heading', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      expect(screen.getByText('Languages')).toBeInTheDocument();
    });

    it('renders Frameworks section heading', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      expect(screen.getByText('Frameworks')).toBeInTheDocument();
    });

    it('renders search input', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('renders Create button', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Create' }),
      ).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Cancel' }),
      ).toBeInTheDocument();
    });

    it('renders language sample cards', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      expect(screen.getByText('Java')).toBeInTheDocument();
    });

    it('renders framework sample cards', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  describe('when searching', () => {
    it('filters languages by search query', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'Java' } });

      expect(screen.getByText('Java')).toBeInTheDocument();
    });

    it('filters frameworks by search query', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'React' } });

      expect(screen.getByText('React')).toBeInTheDocument();
    });

    it('hides non-matching items', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'xyz123' } });

      expect(screen.queryByText('Java')).not.toBeInTheDocument();
      expect(screen.queryByText('React')).not.toBeInTheDocument();
    });
  });

  describe('when selecting items', () => {
    it('allows selecting a language card', async () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      const javaCard = screen.getByText('Java').closest('label');
      expect(javaCard).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(javaCard!);
      });

      await waitFor(() => {
        const checkbox = javaCard!.querySelector('input[type="checkbox"]');
        expect(checkbox).toBeChecked();
      });
    });

    it('allows selecting a framework card', async () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      const reactCard = screen.getByText('React').closest('label');
      expect(reactCard).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(reactCard!);
      });

      await waitFor(() => {
        const checkbox = reactCard!.querySelector('input[type="checkbox"]');
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe('when clicking Create button', () => {
    describe('with samples selected', () => {
      const selectSamplesAndClickCreate = async (
        mockMutateAsync: Mock,
        props: Partial<React.ComponentProps<typeof StandardSamplesModal>> = {},
      ) => {
        mockUseCreateStandardsFromSamplesMutation.mockReturnValue(
          createMockMutation({ mutateAsync: mockMutateAsync }),
        );
        const view = renderWithProviders(
          <StandardSamplesModal {...defaultProps} {...props} />,
        );

        const javaCard = screen.getByText('Java').closest('label');
        await act(async () => {
          fireEvent.click(javaCard!);
        });

        await waitFor(() => {
          const checkbox = javaCard!.querySelector('input[type="checkbox"]');
          return (
            checkbox?.hasAttribute('checked') ||
            checkbox?.closest('[data-state="checked"]')
          );
        });

        const reactCard = screen.getByText('React').closest('label');
        await act(async () => {
          fireEvent.click(reactCard!);
        });

        await waitFor(() => {
          const checkbox = reactCard!.querySelector('input[type="checkbox"]');
          return (
            checkbox?.hasAttribute('checked') ||
            checkbox?.closest('[data-state="checked"]')
          );
        });

        const createButton = screen.getByRole('button', { name: 'Create' });
        await act(async () => {
          fireEvent.click(createButton);
        });

        return view;
      };

      it('calls mutation with selected samples', async () => {
        const mockMutateAsync = vi.fn().mockResolvedValue({ created: [] });
        await selectSamplesAndClickCreate(mockMutateAsync);

        expect(mockMutateAsync).toHaveBeenCalledWith([
          { type: 'language', id: 'java' },
          { type: 'framework', id: 'react' },
        ]);
      });

      it('hands the created standards to the caller', async () => {
        const created = [{ id: 'standard-1' }];
        const onCreated = vi.fn();
        await selectSamplesAndClickCreate(
          vi.fn().mockResolvedValue({ created }),
          { onCreated },
        );

        expect(onCreated).toHaveBeenCalledWith(created);
      });

      describe('when the modal is gone before the creation lands', () => {
        it('hands the created standards over all the same', async () => {
          const created = [{ id: 'standard-1' }];
          const onCreated = vi.fn();
          let settle: (value: { created: unknown[] }) => void = () => undefined;
          const pending = new Promise((resolve) => {
            settle = resolve as typeof settle;
          });

          const view = await selectSamplesAndClickCreate(
            vi.fn().mockReturnValue(pending),
            { onCreated },
          );

          // What the reported case does: creating the first standard of an
          // empty space takes the surface that offered the samples off screen.
          view.unmount();
          await act(async () => {
            settle({ created });
          });

          expect(onCreated).toHaveBeenCalledWith(created);
        });
      });
    });

    describe('with no samples selected', () => {
      it('disables the Create button', () => {
        renderWithProviders(<StandardSamplesModal {...defaultProps} />);

        const createButton = screen.getByRole('button', { name: 'Create' });

        expect(createButton).toBeDisabled();
      });

      describe('when button is clicked', () => {
        it('does not call mutation', async () => {
          const mockMutateAsync = vi.fn();
          mockUseCreateStandardsFromSamplesMutation.mockReturnValue(
            createMockMutation({ mutateAsync: mockMutateAsync }),
          );
          renderWithProviders(<StandardSamplesModal {...defaultProps} />);

          const createButton = screen.getByRole('button', { name: 'Create' });
          await act(async () => {
            fireEvent.click(createButton);
          });

          expect(mockMutateAsync).not.toHaveBeenCalled();
        });
      });
    });

    describe('when mutation is pending', () => {
      it('shows loading state on Create button', () => {
        mockUseCreateStandardsFromSamplesMutation.mockReturnValue(
          createMockMutation({ isPending: true }),
        );
        renderWithProviders(<StandardSamplesModal {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        const createButton = buttons.find(
          (btn) => btn.getAttribute('data-loading') !== null,
        );

        expect(createButton).toBeInTheDocument();
      });

      it('disables the Create button', () => {
        mockUseCreateStandardsFromSamplesMutation.mockReturnValue(
          createMockMutation({ isPending: true }),
        );
        renderWithProviders(<StandardSamplesModal {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        const createButton = buttons.find(
          (btn) => btn.getAttribute('data-loading') !== null,
        );

        expect(createButton).toBeDisabled();
      });
    });
  });

  describe('when clicking Cancel button', () => {
    it('calls onOpenChange with false', async () => {
      const onOpenChange = vi.fn();
      renderWithProviders(
        <StandardSamplesModal open={true} onOpenChange={onOpenChange} />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('when closed', () => {
    it('does not render the modal content', () => {
      renderWithProviders(
        <StandardSamplesModal open={false} onOpenChange={vi.fn()} />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
