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

// Mock the queries
jest.mock('../api/queries/AuthQueries', () => ({
  useSignUpWithOrganizationMutation: jest.fn(),
  useSignInMutation: jest.fn(),
  useCheckEmailAvailabilityMutation: jest.fn(),
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
    createMockMutation<ReturnType<typeof useCheckEmailAvailabilityMutation>>({
      mutateAsync: jest.fn().mockResolvedValue({ available: true }),
      ...overrides,
    });

  describe('when rendering form', () => {
    beforeEach(() => {
      mockUseSignUpWithOrganizationMutation.mockReturnValue(
        createSignUpMutation(),
      );
      mockUseSignInMutation.mockReturnValue(createSignInMutation());
      mockUseCheckEmailAvailabilityMutation.mockReturnValue(
        createEmailCheckMutation(),
      );

      renderWithProviders(<SignUpWithOrganizationForm />);
    });

    it('displays email input', () => {
      expect(
        screen.getByPlaceholderText(/name@yourcompany\.com/i),
      ).toBeInTheDocument();
    });

    it('does not display password input initially', () => {
      expect(
        screen.queryByPlaceholderText(/enter your password/i),
      ).not.toBeInTheDocument();
    });

    it('does not display confirm password input initially', () => {
      expect(
        screen.queryByPlaceholderText(/confirm your password/i),
      ).not.toBeInTheDocument();
    });

    it('displays continue button initially', () => {
      expect(
        screen.getByRole('button', { name: /continue with email/i }),
      ).toBeInTheDocument();
    });

    it('shows password fields after entering email', async () => {
      const user = userEvent.setup();

      // Type in email field
      await user.type(
        screen.getByPlaceholderText(/name@yourcompany\.com/i),
        'test@example.com',
      );

      // Password fields should now be visible
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter your password/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('when email is entered', () => {
    beforeEach(async () => {
      const user = userEvent.setup();

      mockUseSignUpWithOrganizationMutation.mockReturnValue(
        createSignUpMutation(),
      );
      mockUseSignInMutation.mockReturnValue(createSignInMutation());
      mockUseCheckEmailAvailabilityMutation.mockReturnValue(
        createEmailCheckMutation(),
      );

      renderWithProviders(<SignUpWithOrganizationForm />);

      // Type in email field to trigger password fields
      await user.type(
        screen.getByPlaceholderText(/name@yourcompany\.com/i),
        'test@example.com',
      );
    });

    it('displays confirm password field', async () => {
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/confirm your password/i),
        ).toBeInTheDocument();
      });
    });

    it('changes button text to create account', async () => {
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /create account/i }),
        ).toBeInTheDocument();
      });
    });
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

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockSignUpMutation = createSignUpMutation();
    const mockSignInMutation = createSignInMutation();

    mockUseSignUpWithOrganizationMutation.mockReturnValue(mockSignUpMutation);
    mockUseSignInMutation.mockReturnValue(mockSignInMutation);

    renderWithProviders(<SignUpWithOrganizationForm />);

    // Fill out the form
    await user.type(
      screen.getByPlaceholderText(/name@yourcompany\.com/i),
      'test@example.com',
    );

    // Wait for password fields to appear
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/enter your password/i),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText(/enter your password/i),
      'password123!@',
    );
    await user.type(
      screen.getByPlaceholderText(/confirm your password/i),
      'password123!@',
    );

    // Submit the form
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUpMutation.mutate).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          password: 'password123!@',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
        }),
      );
    });
  });

  describe('when signup succeeds', () => {
    let mockSignUpMutation: ReturnType<typeof createSignUpMutation>;
    let mockSignInMutation: ReturnType<typeof createSignInMutation>;
    const mockSignUpResponse = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
        memberships: [],
      },
      organization: {
        id: 'org-1',
        name: "test's organization",
        slug: 'tests-organization',
      },
    };

    beforeEach(async () => {
      const user = userEvent.setup();
      mockSignUpMutation = createSignUpMutation();
      mockSignInMutation = createSignInMutation();

      mockUseSignUpWithOrganizationMutation.mockReturnValue(mockSignUpMutation);
      mockUseSignInMutation.mockReturnValue(mockSignInMutation);

      renderWithProviders(<SignUpWithOrganizationForm />);

      await user.type(
        screen.getByPlaceholderText(/name@yourcompany\.com/i),
        'test@example.com',
      );

      // Wait for password fields to appear
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter your password/i),
        ).toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        'password123!@',
      );
      await user.type(
        screen.getByPlaceholderText(/confirm your password/i),
        'password123!@',
      );
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignUpMutation.mutate).toHaveBeenCalled();
      });

      const signUpCall = mockSignUpMutation.mutate.mock.calls[0];
      const onSuccess = signUpCall[1].onSuccess;
      onSuccess(mockSignUpResponse);
    });

    it('triggers auto-login with correct credentials', () => {
      expect(mockSignInMutation.mutate).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          password: 'password123!@',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });

    describe('when auto-login succeeds', () => {
      beforeEach(() => {
        const signInCall = mockSignInMutation.mutate.mock.calls[0];
        const onSignInSuccess = signInCall[1].onSuccess;
        onSignInSuccess({});
      });

      it('navigates to create organization page', () => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/sign-up/create-organization',
        );
      });
    });

    describe('when auto-login fails', () => {
      beforeEach(() => {
        const signInCall = mockSignInMutation.mutate.mock.calls[0];
        const onSignInError = signInCall[1].onError;
        onSignInError(new Error('Sign in failed'));
      });

      it('navigates to sign-in page', () => {
        expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
      });
    });
  });
});
