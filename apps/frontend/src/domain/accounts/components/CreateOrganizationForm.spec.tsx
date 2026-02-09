import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { CreateOrganizationForm } from './CreateOrganizationForm';
import { useRenameOrganizationMutation } from '../api/queries/AccountsQueries';
import { useAuthContext } from '../hooks/useAuthContext';
import { organizationGateway } from '../api/gateways';

jest.mock('../hooks/useAuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('../api/queries/AccountsQueries', () => ({
  useRenameOrganizationMutation: jest.fn(),
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
        expect(screen.getByText('Name can not be empty')).toBeInTheDocument();
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
});
