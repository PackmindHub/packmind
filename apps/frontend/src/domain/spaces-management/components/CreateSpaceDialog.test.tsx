import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { SpaceType } from '@packmind/types';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import { useCreateSpaceMutation } from '../api/queries/SpacesManagementQueries';

const mockUseAuthContext = jest.fn();
jest.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

const authContextAsAdmin = () => ({
  organization: {
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-org',
    role: 'admin',
  },
});

const authContextAsMember = () => ({
  organization: {
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-org',
    role: 'member',
  },
});

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
    mockUseAuthContext.mockReturnValue(authContextAsAdmin());
    mockUseCreateSpaceMutation.mockReturnValue(createMockMutation());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the dialog is open', () => {
    it('renders available access status options', () => {
      renderWithProviders(<CreateSpaceDialog {...defaultProps} />);

      const wrapper = screen.getByTestId('create-space-type-select');
      const select = wrapper.querySelector('select')!;
      const options = select.querySelectorAll('option');
      const optionTexts = Array.from(options).map((o) => o.textContent);

      expect(optionTexts).toEqual([
        'Open — anyone in the organization can join',
        'Private — accessible only to invited members',
      ]);
    });

    it('selects private as default access status', () => {
      renderWithProviders(<CreateSpaceDialog {...defaultProps} />);

      const wrapper = screen.getByTestId('create-space-type-select');
      const select = wrapper.querySelector('select')!;
      expect(select).toHaveValue(SpaceType.private);
    });
  });

  describe('when submitting with the default type', () => {
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

      const submitButton = screen.getByTestId('create-space-submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'My Space',
          type: SpaceType.private,
        });
      });
    });
  });

  describe('when the user is not an admin', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue(authContextAsMember());
    });

    it('disables the access status selector', () => {
      renderWithProviders(<CreateSpaceDialog {...defaultProps} />);

      const wrapper = screen.getByTestId('create-space-type-select');
      const select = wrapper.querySelector('select')!;
      expect(select).toBeDisabled();
    });

    it('shows a helper text explaining the restriction', () => {
      renderWithProviders(<CreateSpaceDialog {...defaultProps} />);

      expect(
        screen.getByText(
          'Only organization administrators can change space visibility',
        ),
      ).toBeInTheDocument();
    });
  });

  // TODO: Re-enable when restricted type is available in the UI
  // describe('when selecting restricted type before submitting', () => { ... });

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

      const wrapper = screen.getByTestId('create-space-type-select');
      const select = wrapper.querySelector('select')!;
      fireEvent.change(select, { target: { value: SpaceType.private } });

      const submitButton = screen.getByTestId('create-space-submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'My Space',
          type: SpaceType.private,
        });
      });
    });
  });
});
