import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import SignInForm from './SignInForm';
import {
  useSignInMutation,
  useSelectOrganizationMutation,
} from '../api/queries/AuthQueries';
import { useCreateOrganizationMutation } from '../api/queries/AccountsQueries';
import { SignInUserResponse } from '@packmind/accounts/types';

jest.mock('../api/queries/AuthQueries', () => ({
  useSignInMutation: jest.fn(),
  useSelectOrganizationMutation: jest.fn(),
}));

jest.mock('../api/queries/AccountsQueries', () => ({
  useCreateOrganizationMutation: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

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

describe('SignInForm', () => {
  const mockUseSignInMutation = useSignInMutation as jest.MockedFunction<
    typeof useSignInMutation
  >;
  const mockUseSelectOrganizationMutation =
    useSelectOrganizationMutation as jest.MockedFunction<
      typeof useSelectOrganizationMutation
    >;
  const mockUseCreateOrganizationMutation =
    useCreateOrganizationMutation as jest.MockedFunction<
      typeof useCreateOrganizationMutation
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockMutation = <T = unknown,>(overrides = {}) =>
    ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      ...overrides,
    }) as T;

  const createSignInMutation = (overrides = {}) =>
    createMockMutation<ReturnType<typeof useSignInMutation>>(overrides);

  const createSelectOrganizationMutation = (overrides = {}) =>
    createMockMutation<ReturnType<typeof useSelectOrganizationMutation>>(
      overrides,
    );

  const createCreateOrganizationMutation = (overrides = {}) =>
    createMockMutation<ReturnType<typeof useCreateOrganizationMutation>>(
      overrides,
    );

  describe('Sign In Form', () => {
    it('renders sign in form with all required fields', () => {
      mockUseSignInMutation.mockReturnValue(createSignInMutation());
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      renderWithProviders(<SignInForm />);

      expect(
        screen.getByPlaceholderText(/enter your email/i),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your password/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    it('validates email is required', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      renderWithProviders(<SignInForm />);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // When validation fails, the mutation should not be called
      expect(mockSignInMutation.mutate).not.toHaveBeenCalled();
    });

    it('validates email must be at least 3 characters', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'ab');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // When validation fails, the mutation should not be called
      expect(mockSignInMutation.mutate).not.toHaveBeenCalled();
    });

    it('validates password is required', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // When validation fails, the mutation should not be called
      expect(mockSignInMutation.mutate).not.toHaveBeenCalled();
    });

    it('submits form with valid credentials', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalledWith(
          {
            email: 'test@example.com',
            password: 'password123',
          },
          expect.objectContaining({
            onSuccess: expect.any(Function),
            onError: expect.any(Function),
          }),
        );
      });
    });

    it('displays error message on sign in failure', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalled();
      });

      const signInCall = mockSignInMutation.mutate.mock.calls[0];
      const onError = signInCall[1].onError;
      onError(new Error('Invalid credentials'));

      await waitFor(() => {
        expect(
          screen.getByText('Invalid email or password'),
        ).toBeInTheDocument();
      });
    });

    it('navigates to organization page when user has single organization', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      const mockSignInResponse: SignInUserResponse = {
        organization: {
          id: 'org-1',
          name: 'Test Organization',
          slug: 'test-organization',
          role: 'admin',
        },
      };

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalled();
      });

      const signInCall = mockSignInMutation.mutate.mock.calls[0];
      const onSuccess = signInCall[1].onSuccess;
      onSuccess(mockSignInResponse);

      expect(mockNavigate).toHaveBeenCalledWith('/org/test-organization');
    });

    it('prevents double submission', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation({ isPending: true });
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /signing in/i });
      await user.click(signInButton);

      expect(mockSignInMutation.mutate).not.toHaveBeenCalled();
    });

    it('trims email before submission', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, '  test@example.com  ');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalledWith(
          {
            email: 'test@example.com',
            password: 'password123',
          },
          expect.anything(),
        );
      });
    });
  });

  describe('Organization Selection', () => {
    it('shows organization selection when user has multiple organizations', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      const mockSignInResponse: SignInUserResponse = {
        organizations: [
          {
            organization: {
              id: 'org-1',
              name: 'Organization 1',
              slug: 'organization-1',
            },
            role: 'admin',
          },
          {
            organization: {
              id: 'org-2',
              name: 'Organization 2',
              slug: 'organization-2',
            },
            role: 'member',
          },
        ],
      };

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalled();
      });

      const signInCall = mockSignInMutation.mutate.mock.calls[0];
      const onSuccess = signInCall[1].onSuccess;

      act(() => {
        onSuccess(mockSignInResponse);
      });

      await waitFor(() => {
        expect(screen.getByText('Select Organization')).toBeInTheDocument();
        expect(screen.getByText('Organization 1')).toBeInTheDocument();
        expect(screen.getByText('Organization 2')).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /continue to organization/i }),
        ).toBeInTheDocument();
      });
    });

    it('validates organization selection is required', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      const mockSelectOrganizationMutation = createSelectOrganizationMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        mockSelectOrganizationMutation,
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      const mockSignInResponse: SignInUserResponse = {
        organizations: [
          {
            organization: {
              id: 'org-1',
              name: 'Organization 1',
              slug: 'organization-1',
            },
            role: 'admin',
          },
        ],
      };

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalled();
      });

      const signInCall = mockSignInMutation.mutate.mock.calls[0];
      const onSuccess = signInCall[1].onSuccess;

      act(() => {
        onSuccess(mockSignInResponse);
      });

      await waitFor(() => {
        expect(screen.getByText('Select Organization')).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', {
        name: /continue to organization/i,
      });
      await user.click(continueButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please select an organization'),
        ).toBeInTheDocument();
      });
    });

    it('selects organization and navigates', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      const mockSelectOrganizationMutation = createSelectOrganizationMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        mockSelectOrganizationMutation,
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      const mockSignInResponse: SignInUserResponse = {
        organizations: [
          {
            organization: {
              id: 'org-1',
              name: 'Organization 1',
              slug: 'organization-1',
            },
            role: 'admin',
          },
          {
            organization: {
              id: 'org-2',
              name: 'Organization 2',
              slug: 'organization-2',
            },
            role: 'member',
          },
        ],
      };

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalled();
      });

      const signInCall = mockSignInMutation.mutate.mock.calls[0];
      const onSuccess = signInCall[1].onSuccess;

      act(() => {
        onSuccess(mockSignInResponse);
      });

      await waitFor(() => {
        expect(screen.getByText('Select Organization')).toBeInTheDocument();
      });

      const organizationSelect = screen.getByRole('combobox');
      await user.selectOptions(organizationSelect, 'organization-2');

      const continueButton = screen.getByRole('button', {
        name: /continue to organization/i,
      });
      await user.click(continueButton);

      await waitFor(() => {
        expect(mockSelectOrganizationMutation.mutate).toHaveBeenCalledWith(
          { organizationId: 'org-2' },
          expect.objectContaining({
            onSuccess: expect.any(Function),
            onError: expect.any(Function),
          }),
        );
      });

      const selectOrgCall = mockSelectOrganizationMutation.mutate.mock.calls[0];
      const onSelectSuccess = selectOrgCall[1].onSuccess;

      act(() => {
        onSelectSuccess();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/org/organization-2');
    });
  });

  describe('Organization Creation', () => {
    it('shows organization creation when user has no organizations', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        createCreateOrganizationMutation(),
      );

      const mockSignInResponse: SignInUserResponse = {
        organizations: [],
      };

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalled();
      });

      const signInCall = mockSignInMutation.mutate.mock.calls[0];
      const onSuccess = signInCall[1].onSuccess;

      act(() => {
        onSuccess(mockSignInResponse);
      });

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter organization name/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /create organization/i }),
        ).toBeInTheDocument();
      });
    });

    it('validates organization name is required', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      const mockCreateOrganizationMutation = createCreateOrganizationMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        mockCreateOrganizationMutation,
      );

      const mockSignInResponse: SignInUserResponse = {
        organizations: [],
      };

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalled();
      });

      const signInCall = mockSignInMutation.mutate.mock.calls[0];
      const onSuccess = signInCall[1].onSuccess;

      act(() => {
        onSuccess(mockSignInResponse);
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /create organization/i }),
        ).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', {
        name: /create organization/i,
      });
      await user.click(createButton);

      await waitFor(() => {
        expect(
          screen.getByText('Organization name is required'),
        ).toBeInTheDocument();
      });
    });

    it('validates organization name must be at least 3 characters', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      const mockCreateOrganizationMutation = createCreateOrganizationMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        mockCreateOrganizationMutation,
      );

      const mockSignInResponse: SignInUserResponse = {
        organizations: [],
      };

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalled();
      });

      const signInCall = mockSignInMutation.mutate.mock.calls[0];
      const onSuccess = signInCall[1].onSuccess;

      act(() => {
        onSuccess(mockSignInResponse);
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /create organization/i }),
        ).toBeInTheDocument();
      });

      const organizationNameInput = screen.getByPlaceholderText(
        /enter organization name/i,
      );
      await user.type(organizationNameInput, 'ab');

      const createButton = screen.getByRole('button', {
        name: /create organization/i,
      });
      await user.click(createButton);

      await waitFor(() => {
        expect(
          screen.getByText('Organization name must be at least 3 characters'),
        ).toBeInTheDocument();
      });
    });

    it('creates organization and navigates', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      const mockCreateOrganizationMutation = createCreateOrganizationMutation();
      const mockSelectOrganizationMutation = createSelectOrganizationMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        mockSelectOrganizationMutation,
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        mockCreateOrganizationMutation,
      );

      const mockSignInResponse: SignInUserResponse = {
        organizations: [],
      };

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalled();
      });

      const signInCall = mockSignInMutation.mutate.mock.calls[0];
      const onSuccess = signInCall[1].onSuccess;

      act(() => {
        onSuccess(mockSignInResponse);
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /create organization/i }),
        ).toBeInTheDocument();
      });

      const organizationNameInput = screen.getByPlaceholderText(
        /enter organization name/i,
      );
      await user.type(organizationNameInput, 'New Organization');

      const createButton = screen.getByRole('button', {
        name: /create organization/i,
      });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateOrganizationMutation.mutate).toHaveBeenCalledWith(
          { name: 'New Organization' },
          expect.objectContaining({
            onSuccess: expect.any(Function),
            onError: expect.any(Function),
          }),
        );
      });

      const createOrgCall = mockCreateOrganizationMutation.mutate.mock.calls[0];
      const onCreateSuccess = createOrgCall[1].onSuccess;

      act(() => {
        onCreateSuccess({
          id: 'org-1',
          name: 'New Organization',
          slug: 'new-organization',
        });
      });

      await waitFor(() => {
        expect(mockSelectOrganizationMutation.mutate).toHaveBeenCalledWith(
          { organizationId: 'org-1' },
          expect.objectContaining({
            onSuccess: expect.any(Function),
          }),
        );
      });

      const selectOrgCall = mockSelectOrganizationMutation.mutate.mock.calls[0];
      const onSelectSuccess = selectOrgCall[1].onSuccess;

      act(() => {
        onSelectSuccess();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/org/new-organization');
    });

    it('trims organization name before creation', async () => {
      const user = userEvent.setup();
      const mockSignInMutation = createSignInMutation();
      const mockCreateOrganizationMutation = createCreateOrganizationMutation();
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);
      mockUseSelectOrganizationMutation.mockReturnValue(
        createSelectOrganizationMutation(),
      );
      mockUseCreateOrganizationMutation.mockReturnValue(
        mockCreateOrganizationMutation,
      );

      const mockSignInResponse: SignInUserResponse = {
        organizations: [],
      };

      renderWithProviders(<SignInForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignInMutation.mutate).toHaveBeenCalled();
      });

      const signInCall = mockSignInMutation.mutate.mock.calls[0];
      const onSuccess = signInCall[1].onSuccess;

      act(() => {
        onSuccess(mockSignInResponse);
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /create organization/i }),
        ).toBeInTheDocument();
      });

      const organizationNameInput = screen.getByPlaceholderText(
        /enter organization name/i,
      );
      await user.type(organizationNameInput, '  New Organization  ');

      const createButton = screen.getByRole('button', {
        name: /create organization/i,
      });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateOrganizationMutation.mutate).toHaveBeenCalledWith(
          { name: 'New Organization' },
          expect.anything(),
        );
      });
    });
  });
});
