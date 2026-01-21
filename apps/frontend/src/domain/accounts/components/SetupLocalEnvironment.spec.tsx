import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { SetupLocalEnvironment } from './SetupLocalEnvironment';
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

const renderWithQueryClient = (component: React.ReactElement) => {
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

describe('SetupLocalEnvironment', () => {
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

  describe('when mounting', () => {
    it('automatically generates install command', () => {
      const mutateMock = jest.fn();
      mockUseCreateCliLoginCodeMutation.mockReturnValue({
        ...defaultMutationResult,
        mutate: mutateMock,
      } as ReturnType<typeof useCreateCliLoginCodeMutation>);

      renderWithQueryClient(<SetupLocalEnvironment />);

      expect(mutateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when generating command', () => {
    it('displays loading state', () => {
      mockUseCreateCliLoginCodeMutation.mockReturnValue({
        ...defaultMutationResult,
        isPending: true,
      } as ReturnType<typeof useCreateCliLoginCodeMutation>);

      renderWithQueryClient(<SetupLocalEnvironment />);

      expect(
        screen.getByText('Generating install command...'),
      ).toBeInTheDocument();
    });
  });

  describe('when command is successfully generated', () => {
    const mockCode = 'test-login-code-123';
    const mockExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    beforeEach(() => {
      mockUseCreateCliLoginCodeMutation.mockReturnValue({
        ...defaultMutationResult,
        isSuccess: true,
        data: { code: mockCode, expiresAt: mockExpiresAt },
      } as ReturnType<typeof useCreateCliLoginCodeMutation>);

      renderWithQueryClient(<SetupLocalEnvironment />);
    });

    it('displays install command', () => {
      expect(screen.getByTestId('install-command')).toBeInTheDocument();
    });

    it('displays expiration countdown', () => {
      expect(
        screen.getByText(/Code expires in \d+ minute/),
      ).toBeInTheDocument();
    });

    it('displays generate new command button', () => {
      expect(screen.getByText('Generate New Command')).toBeInTheDocument();
    });
  });

  describe('when clicking generate new command button', () => {
    it('calls mutate function', () => {
      const mutateMock = jest.fn();
      const mockCode = 'test-login-code-123';
      const mockExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      mockUseCreateCliLoginCodeMutation.mockReturnValue({
        ...defaultMutationResult,
        mutate: mutateMock,
        isSuccess: true,
        data: { code: mockCode, expiresAt: mockExpiresAt },
      } as ReturnType<typeof useCreateCliLoginCodeMutation>);

      renderWithQueryClient(<SetupLocalEnvironment />);

      const button = screen.getByText('Generate New Command');
      fireEvent.click(button);

      expect(mutateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when generation fails', () => {
    const mockError = new Error('Failed to generate code');

    beforeEach(() => {
      mockUseCreateCliLoginCodeMutation.mockReturnValue({
        ...defaultMutationResult,
        isError: true,
        error: mockError,
      } as ReturnType<typeof useCreateCliLoginCodeMutation>);

      renderWithQueryClient(<SetupLocalEnvironment />);
    });

    it('displays error title', () => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('displays error message', () => {
      expect(screen.getByText('Failed to generate code')).toBeInTheDocument();
    });
  });
});
