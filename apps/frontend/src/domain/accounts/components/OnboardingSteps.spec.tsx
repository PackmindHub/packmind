import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnboardingSteps } from './OnboardingSteps';
import { useCreateCliLoginCodeMutation } from '../api/queries/AuthQueries';

jest.mock('../api/queries/AuthQueries', () => ({
  useCreateCliLoginCodeMutation: jest.fn(),
}));

jest.mock('../../../shared/components/inputs', () => ({
  CopiableTextarea: ({
    value,
    ...props
  }: {
    value: string;
    [key: string]: unknown;
  }) => <textarea value={value} readOnly {...props} />,
}));

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

describe('OnboardingSteps', () => {
  const mockUseCreateCliLoginCodeMutation =
    useCreateCliLoginCodeMutation as jest.MockedFunction<
      typeof useCreateCliLoginCodeMutation
    >;

  const defaultMutationResult = {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
    status: 'idle' as const,
    data: undefined,
    error: null,
    variables: undefined,
    reset: jest.fn(),
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    context: undefined,
    isPaused: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCreateCliLoginCodeMutation.mockReturnValue(
      defaultMutationResult as ReturnType<typeof useCreateCliLoginCodeMutation>,
    );
  });

  it('renders all three onboarding steps', () => {
    renderWithProviders(<OnboardingSteps />);

    expect(
      screen.getByText('Configure your local environment'),
    ).toBeInTheDocument();
    expect(screen.getByText('Build your playbook')).toBeInTheDocument();
    expect(screen.getByText('Vibe code with confidence')).toBeInTheDocument();
  });

  it('renders the first step expanded by default', () => {
    renderWithProviders(<OnboardingSteps />);

    // The first step should be expanded and show the SetupLocalEnvironment component content
    expect(
      screen.getByText(
        'Copy and run this command in your terminal to install the CLI and MCP server automatically.',
      ),
    ).toBeInTheDocument();
  });

  it('renders placeholder content for step 2', () => {
    renderWithProviders(<OnboardingSteps />);

    expect(
      screen.getByText('Content for step 2 will be added here'),
    ).toBeInTheDocument();
  });

  it('renders placeholder content for step 3', () => {
    renderWithProviders(<OnboardingSteps />);

    expect(
      screen.getByText('Content for step 3 will be added here'),
    ).toBeInTheDocument();
  });
});
