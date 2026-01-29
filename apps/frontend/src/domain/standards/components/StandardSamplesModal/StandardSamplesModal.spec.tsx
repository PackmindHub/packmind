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

jest.mock('../../api/queries/StandardsQueries', () => ({
  useCreateStandardsFromSamplesMutation: jest.fn(),
}));

const mockUseCreateStandardsFromSamplesMutation =
  useCreateStandardsFromSamplesMutation as jest.MockedFunction<
    typeof useCreateStandardsFromSamplesMutation
  >;

const createMockMutation = (overrides = {}) =>
  ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
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
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    mockUseCreateStandardsFromSamplesMutation.mockReturnValue(
      createMockMutation(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      expect(screen.getByText('Spring')).toBeInTheDocument();
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
      fireEvent.change(searchInput, { target: { value: 'Spring' } });

      expect(screen.getByText('Spring')).toBeInTheDocument();
    });

    it('hides non-matching items', () => {
      renderWithProviders(<StandardSamplesModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'xyz123' } });

      expect(screen.queryByText('Java')).not.toBeInTheDocument();
      expect(screen.queryByText('Spring')).not.toBeInTheDocument();
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

      const springCard = screen.getByText('Spring').closest('label');
      expect(springCard).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(springCard!);
      });

      await waitFor(() => {
        const checkbox = springCard!.querySelector('input[type="checkbox"]');
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe('when clicking Create button', () => {
    describe('with samples selected', () => {
      const selectSamplesAndClickCreate = async (mockMutate: jest.Mock) => {
        mockUseCreateStandardsFromSamplesMutation.mockReturnValue(
          createMockMutation({ mutate: mockMutate }),
        );
        renderWithProviders(<StandardSamplesModal {...defaultProps} />);

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

        const springCard = screen.getByText('Spring').closest('label');
        await act(async () => {
          fireEvent.click(springCard!);
        });

        await waitFor(() => {
          const checkbox = springCard!.querySelector('input[type="checkbox"]');
          return (
            checkbox?.hasAttribute('checked') ||
            checkbox?.closest('[data-state="checked"]')
          );
        });

        const createButton = screen.getByRole('button', { name: 'Create' });
        await act(async () => {
          fireEvent.click(createButton);
        });
      };

      it('calls mutation with selected samples', async () => {
        const mockMutate = jest.fn();
        await selectSamplesAndClickCreate(mockMutate);

        expect(mockMutate).toHaveBeenCalledWith(
          [
            { type: 'language', id: 'java' },
            { type: 'framework', id: 'spring' },
          ],
          expect.any(Object),
        );
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
          const mockMutate = jest.fn();
          mockUseCreateStandardsFromSamplesMutation.mockReturnValue(
            createMockMutation({ mutate: mockMutate }),
          );
          renderWithProviders(<StandardSamplesModal {...defaultProps} />);

          const createButton = screen.getByRole('button', { name: 'Create' });
          await act(async () => {
            fireEvent.click(createButton);
          });

          expect(mockMutate).not.toHaveBeenCalled();
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
      const onOpenChange = jest.fn();
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
        <StandardSamplesModal open={false} onOpenChange={jest.fn()} />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
