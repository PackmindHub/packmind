import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { CreateOrganizationForm } from './CreateOrganizationForm';
import {
  useRenameOrganizationMutation,
  useCreateOrganizationMutation,
} from '../api/queries/AccountsQueries';
import { useSelectOrganizationMutation } from '../api/queries/AuthQueries';
import { useAuthContext } from '../hooks/useAuthContext';
import { organizationGateway } from '../api/gateways';

jest.mock('../hooks/useAuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('../api/queries/AccountsQueries', () => ({
  useRenameOrganizationMutation: jest.fn(),
  useCreateOrganizationMutation: jest.fn(),
}));

jest.mock('../api/queries/AuthQueries', () => ({
  useSelectOrganizationMutation: jest.fn(),
}));

jest.mock('../api/gateways', () => ({
  organizationGateway: {
    getByName: jest.fn(),
  },
}));

jest.mock('../../../services/api/errors/PackmindConflictError', () => ({
  isPackmindConflictError: jest.fn(),
}));

const mockUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;
const mockUseRenameOrganizationMutation =
  useRenameOrganizationMutation as jest.MockedFunction<
    typeof useRenameOrganizationMutation
  >;
const mockUseCreateOrganizationMutation =
  useCreateOrganizationMutation as jest.MockedFunction<
    typeof useCreateOrganizationMutation
  >;
const mockUseSelectOrganizationMutation =
  useSelectOrganizationMutation as jest.MockedFunction<
    typeof useSelectOrganizationMutation
  >;
const mockOrganizationGateway = organizationGateway as jest.Mocked<
  typeof organizationGateway
>;

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

describe('CreateOrganizationForm', () => {
  const defaultOrganization = {
    id: 'org-1',
    name: "testuser's organization",
    slug: 'testusers-organization',
    role: 'admin' as const,
  };

  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      organization: defaultOrganization,
      getMe: jest.fn(),
      getUserOrganizations: jest.fn(),
      validateAndSwitchIfNeeded: jest.fn(),
    });

    mockUseRenameOrganizationMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useRenameOrganizationMutation>);

    mockUseCreateOrganizationMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useCreateOrganizationMutation>);

    mockUseSelectOrganizationMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useSelectOrganizationMutation>);

    mockOrganizationGateway.getByName.mockRejectedValue(new Error('Not found'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when organization name is cleared', () => {
    it('displays error message', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm onSuccess={mockOnSuccess} />);

      const input = screen.getByTestId(
        'CreateOrganizationForm.OrganizationNameInput',
      );
      await user.clear(input);

      await waitFor(() => {
        expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
      });
    });

    it('disables submit button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm onSuccess={mockOnSuccess} />);

      const input = screen.getByTestId(
        'CreateOrganizationForm.OrganizationNameInput',
      );
      await user.clear(input);

      await waitFor(() => {
        expect(
          screen.getByTestId('CreateOrganizationForm.SubmitButton'),
        ).toBeDisabled();
      });
    });

    it('does not auto-refill the field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm onSuccess={mockOnSuccess} />);

      const input = screen.getByTestId(
        'CreateOrganizationForm.OrganizationNameInput',
      );
      await user.clear(input);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('when organization does not exist in auth context', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        organization: undefined,
        getMe: jest.fn(),
        getUserOrganizations: jest.fn(),
        validateAndSwitchIfNeeded: jest.fn(),
      });
    });

    it('starts with an empty input', () => {
      renderWithProviders(<CreateOrganizationForm onSuccess={mockOnSuccess} />);

      const input = screen.getByTestId(
        'CreateOrganizationForm.OrganizationNameInput',
      );
      expect(input).toHaveValue('');
    });

    it('calls createOrganizationMutation on submit', async () => {
      const mockCreateMutate = jest.fn();
      mockUseCreateOrganizationMutation.mockReturnValue({
        mutate: mockCreateMutate,
        isPending: false,
        error: null,
      } as unknown as ReturnType<typeof useCreateOrganizationMutation>);

      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm onSuccess={mockOnSuccess} />);

      const input = screen.getByTestId(
        'CreateOrganizationForm.OrganizationNameInput',
      );
      await user.type(input, 'My New Org');

      await waitFor(() => {
        expect(
          screen.getByTestId('CreateOrganizationForm.SubmitButton'),
        ).not.toBeDisabled();
      });

      await user.click(
        screen.getByTestId('CreateOrganizationForm.SubmitButton'),
      );

      expect(mockCreateMutate).toHaveBeenCalledWith(
        { name: 'My New Org' },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it('calls selectOrganizationMutation after successful creation', async () => {
      const mockSelectMutate = jest.fn();
      const mockCreateMutate = jest
        .fn()
        .mockImplementation((_data, options) => {
          options.onSuccess({
            id: 'new-org-id',
            name: 'My New Org',
            slug: 'my-new-org',
          });
        });

      mockUseCreateOrganizationMutation.mockReturnValue({
        mutate: mockCreateMutate,
        isPending: false,
        error: null,
      } as unknown as ReturnType<typeof useCreateOrganizationMutation>);

      mockUseSelectOrganizationMutation.mockReturnValue({
        mutate: mockSelectMutate,
        isPending: false,
        error: null,
      } as unknown as ReturnType<typeof useSelectOrganizationMutation>);

      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm onSuccess={mockOnSuccess} />);

      const input = screen.getByTestId(
        'CreateOrganizationForm.OrganizationNameInput',
      );
      await user.type(input, 'My New Org');

      await waitFor(() => {
        expect(
          screen.getByTestId('CreateOrganizationForm.SubmitButton'),
        ).not.toBeDisabled();
      });

      await user.click(
        screen.getByTestId('CreateOrganizationForm.SubmitButton'),
      );

      expect(mockSelectMutate).toHaveBeenCalledWith(
        { organizationId: 'new-org-id' },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it('calls onSuccess after successful selection', async () => {
      const mockSelectMutate = jest
        .fn()
        .mockImplementation((_data, options) => {
          options.onSuccess();
        });
      const mockCreateMutate = jest
        .fn()
        .mockImplementation((_data, options) => {
          options.onSuccess({
            id: 'new-org-id',
            name: 'My New Org',
            slug: 'my-new-org',
          });
        });

      mockUseCreateOrganizationMutation.mockReturnValue({
        mutate: mockCreateMutate,
        isPending: false,
        error: null,
      } as unknown as ReturnType<typeof useCreateOrganizationMutation>);

      mockUseSelectOrganizationMutation.mockReturnValue({
        mutate: mockSelectMutate,
        isPending: false,
        error: null,
      } as unknown as ReturnType<typeof useSelectOrganizationMutation>);

      const user = userEvent.setup();
      renderWithProviders(<CreateOrganizationForm onSuccess={mockOnSuccess} />);

      const input = screen.getByTestId(
        'CreateOrganizationForm.OrganizationNameInput',
      );
      await user.type(input, 'My New Org');

      await waitFor(() => {
        expect(
          screen.getByTestId('CreateOrganizationForm.SubmitButton'),
        ).not.toBeDisabled();
      });

      await user.click(
        screen.getByTestId('CreateOrganizationForm.SubmitButton'),
      );

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
