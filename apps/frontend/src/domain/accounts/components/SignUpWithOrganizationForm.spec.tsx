import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import SignUpWithOrganizationForm from './SignUpWithOrganizationForm';
import {
  useSignUpWithOrganizationMutation,
  useSignInMutation,
  useCheckEmailAvailabilityMutation,
} from '../api/queries/AuthQueries';
import { organizationGateway } from '../api/gateways';

// Mock the queries
jest.mock('../api/queries/AuthQueries', () => ({
  useSignUpWithOrganizationMutation: jest.fn(),
  useSignInMutation: jest.fn(),
  useCheckEmailAvailabilityMutation: jest.fn(),
}));

// Mock the organization gateway
jest.mock('../api/gateways', () => ({
  organizationGateway: {
    getByName: jest.fn(),
  },
}));

// Mock the error utility
jest.mock('../../../services/api/errors/PackmindConflictError', () => ({
  isPackmindConflictError: jest.fn(),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
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

describe('SignUpWithOrganizationForm', () => {
  const mockUseSignUpWithOrganizationMutation =
    useSignUpWithOrganizationMutation as jest.MockedFunction<
      typeof useSignUpWithOrganizationMutation
    >;
  const mockUseSignInMutation = useSignInMutation as jest.MockedFunction<
    typeof useSignInMutation
  >;
  const mockUseCheckEmailAvailabilityMutation =
    useCheckEmailAvailabilityMutation as jest.MockedFunction<
      typeof useCheckEmailAvailabilityMutation
    >;

  afterEach(() => {
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

  // Typed helper functions for cleaner usage
  const createSignUpMutation = (overrides = {}) =>
    createMockMutation<ReturnType<typeof useSignUpWithOrganizationMutation>>(
      overrides,
    );

  const createSignInMutation = (overrides = {}) =>
    createMockMutation<ReturnType<typeof useSignInMutation>>(overrides);

  const createEmailCheckMutation = (overrides = {}) =>
    createMockMutation<ReturnType<typeof useCheckEmailAvailabilityMutation>>(
      overrides,
    );

  it('renders form with all required fields', () => {
    mockUseSignUpWithOrganizationMutation.mockReturnValue(
      createSignUpMutation(),
    );
    mockUseSignInMutation.mockReturnValue(createSignInMutation());
    mockUseCheckEmailAvailabilityMutation.mockReturnValue(
      createEmailCheckMutation(),
    );

    renderWithProviders(<SignUpWithOrganizationForm />);

    expect(
      screen.getByPlaceholderText(/enter organization name/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/enter your email/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/enter your password/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/confirm your password/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create account & organization/i }),
    ).toBeInTheDocument();
  });

  it('displays correct button text during signup', () => {
    mockUseSignUpWithOrganizationMutation.mockReturnValue(
      createSignUpMutation({ isPending: true }),
    );
    mockUseSignInMutation.mockReturnValue(createSignInMutation());
    mockUseCheckEmailAvailabilityMutation.mockReturnValue(
      createEmailCheckMutation(),
    );

    renderWithProviders(<SignUpWithOrganizationForm />);

    expect(
      screen.getByRole('button', { name: /creating account/i }),
    ).toBeInTheDocument();
  });

  it('displays correct button text during sign in', () => {
    mockUseSignUpWithOrganizationMutation.mockReturnValue(
      createSignUpMutation(),
    );
    mockUseSignInMutation.mockReturnValue(
      createSignInMutation({ isPending: true }),
    );

    renderWithProviders(<SignUpWithOrganizationForm />);

    expect(
      screen.getByRole('button', { name: /signing in/i }),
    ).toBeInTheDocument();
  });

  it('validates organization name availability in real-time', async () => {
    const user = userEvent.setup();
    const mockSignUpMutation = createSignUpMutation();
    const mockSignInMutation = createSignInMutation();
    const mockOrganizationGateway = organizationGateway as jest.Mocked<
      typeof organizationGateway
    >;

    mockUseSignUpWithOrganizationMutation.mockReturnValue(mockSignUpMutation);
    mockUseSignInMutation.mockReturnValue(mockSignInMutation);

    // Mock organization exists (conflict)
    mockOrganizationGateway.getByName.mockResolvedValue({
      id: 'org-1',
      name: 'Existing Organization',
      slug: 'existing-organization',
    });

    renderWithProviders(<SignUpWithOrganizationForm />);

    const organizationNameInput = screen.getByPlaceholderText(
      /enter organization name/i,
    );
    await user.type(organizationNameInput, 'Existing Organization');

    // Wait for debounced validation
    await waitFor(
      () => {
        expect(mockOrganizationGateway.getByName).toHaveBeenCalledWith(
          'Existing Organization',
        );
      },
      { timeout: 1000 },
    );

    await waitFor(() => {
      expect(
        screen.getByText('Organization name already exists'),
      ).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockSignUpMutation = createSignUpMutation();
    const mockSignInMutation = createSignInMutation();
    const mockOrganizationGateway = organizationGateway as jest.Mocked<
      typeof organizationGateway
    >;

    mockUseSignUpWithOrganizationMutation.mockReturnValue(mockSignUpMutation);
    mockUseSignInMutation.mockReturnValue(mockSignInMutation);

    // Mock organization doesn't exist
    mockOrganizationGateway.getByName.mockRejectedValue(new Error('Not found'));

    renderWithProviders(<SignUpWithOrganizationForm />);

    // Fill out the form
    await user.type(
      screen.getByPlaceholderText(/enter organization name/i),
      'Test Organization',
    );
    await user.type(
      screen.getByPlaceholderText(/enter your email/i),
      'test@example.com',
    );
    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      'password123!@',
    );
    await user.type(
      screen.getByPlaceholderText(/confirm your password/i),
      'password123!@',
    );

    // Submit the form
    await user.click(
      screen.getByRole('button', { name: /create account & organization/i }),
    );

    await waitFor(() => {
      expect(mockSignUpMutation.mutate).toHaveBeenCalledWith(
        {
          organizationName: 'Test Organization',
          email: 'test@example.com',
          password: 'password123!@',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });

  it('triggers auto-login flow after successful signup', async () => {
    const user = userEvent.setup();
    const mockSignUpMutation = createSignUpMutation();
    const mockSignInMutation = createSignInMutation();

    mockUseSignUpWithOrganizationMutation.mockReturnValue(mockSignUpMutation);
    mockUseSignInMutation.mockReturnValue(mockSignInMutation);

    const mockSignUpResponse = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
        memberships: [],
      },
      organization: {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-organization',
      },
    };

    renderWithProviders(<SignUpWithOrganizationForm />);

    // Fill and submit form
    await user.type(
      screen.getByPlaceholderText(/enter organization name/i),
      'Test Organization',
    );
    await user.type(
      screen.getByPlaceholderText(/enter your email/i),
      'test@example.com',
    );
    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      'password123!@',
    );
    await user.type(
      screen.getByPlaceholderText(/confirm your password/i),
      'password123!@',
    );
    await user.click(
      screen.getByRole('button', { name: /create account & organization/i }),
    );

    // Wait for signup to be called
    await waitFor(() => {
      expect(mockSignUpMutation.mutate).toHaveBeenCalled();
    });

    // Simulate successful signup by calling the onSuccess callback
    const signUpCall = mockSignUpMutation.mutate.mock.calls[0];
    const onSuccess = signUpCall[1].onSuccess;
    onSuccess(mockSignUpResponse);

    // Check that auto-login is triggered
    expect(mockSignInMutation.mutate).toHaveBeenCalledWith(
      {
        email: 'test@example.com',
        password: 'password123!@',
        organizationId: 'org-1',
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it('navigates to organization dashboard after successful auto-login', async () => {
    const user = userEvent.setup();
    const mockSignUpMutation = createSignUpMutation();
    const mockSignInMutation = createSignInMutation();

    mockUseSignUpWithOrganizationMutation.mockReturnValue(mockSignUpMutation);
    mockUseSignInMutation.mockReturnValue(mockSignInMutation);

    const mockSignUpResponse = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
        memberships: [],
      },
      organization: {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-organization',
      },
    };

    renderWithProviders(<SignUpWithOrganizationForm />);

    // Fill and submit form
    await user.type(
      screen.getByPlaceholderText(/enter organization name/i),
      'Test Organization',
    );
    await user.type(
      screen.getByPlaceholderText(/enter your email/i),
      'test@example.com',
    );
    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      'password123!@',
    );
    await user.type(
      screen.getByPlaceholderText(/confirm your password/i),
      'password123!@',
    );
    await user.click(
      screen.getByRole('button', { name: /create account & organization/i }),
    );

    await waitFor(() => {
      expect(mockSignUpMutation.mutate).toHaveBeenCalled();
    });

    // Simulate successful signup
    const signUpCall = mockSignUpMutation.mutate.mock.calls[0];
    const onSignUpSuccess = signUpCall[1].onSuccess;
    onSignUpSuccess(mockSignUpResponse);

    // Simulate successful signin
    const signInCall = mockSignInMutation.mutate.mock.calls[0];
    const onSignInSuccess = signInCall[1].onSuccess;
    onSignInSuccess({});

    expect(mockNavigate).toHaveBeenCalledWith('/org/test-organization');
  });

  it('navigates to sign-in page when auto-login fails', async () => {
    const user = userEvent.setup();
    const mockSignUpMutation = createSignUpMutation();
    const mockSignInMutation = createSignInMutation();

    mockUseSignUpWithOrganizationMutation.mockReturnValue(mockSignUpMutation);
    mockUseSignInMutation.mockReturnValue(mockSignInMutation);

    const mockSignUpResponse = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
        memberships: [],
      },
      organization: {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-organization',
      },
    };

    renderWithProviders(<SignUpWithOrganizationForm />);

    // Fill and submit form
    await user.type(
      screen.getByPlaceholderText(/enter organization name/i),
      'Test Organization',
    );
    await user.type(
      screen.getByPlaceholderText(/enter your email/i),
      'test@example.com',
    );
    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      'password123!@',
    );
    await user.type(
      screen.getByPlaceholderText(/confirm your password/i),
      'password123!@',
    );
    await user.click(
      screen.getByRole('button', { name: /create account & organization/i }),
    );

    await waitFor(() => {
      expect(mockSignUpMutation.mutate).toHaveBeenCalled();
    });

    // Simulate successful signup
    const signUpCall = mockSignUpMutation.mutate.mock.calls[0];
    const onSignUpSuccess = signUpCall[1].onSuccess;
    onSignUpSuccess(mockSignUpResponse);

    // Simulate failed signin
    const signInCall = mockSignInMutation.mutate.mock.calls[0];
    const onSignInError = signInCall[1].onError;
    onSignInError(new Error('Sign in failed'));

    expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
  });
});
