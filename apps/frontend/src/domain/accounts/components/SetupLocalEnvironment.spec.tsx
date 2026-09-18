import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { SetupLocalEnvironment } from './SetupLocalEnvironment';
import { useCreateCliLoginCodeMutation } from '../api/queries/AuthQueries';
import type { MockedFunction } from 'vitest';
import {
  createFailedMutationResult,
  createIdleMutationResult,
  createPendingMutationResult,
  createSuccessMutationResult,
} from '../../../test/mutationResultMocks';
import { CreateCliLoginCodeResponse } from '@packmind/types';

vi.mock('../api/queries/AuthQueries', () => ({
  useCreateCliLoginCodeMutation: vi.fn(),
}));

vi.mock('../../../shared/components/inputs', () => ({
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
    useCreateCliLoginCodeMutation as MockedFunction<
      typeof useCreateCliLoginCodeMutation
    >;

  const idleMutation = (mutate = vi.fn()) =>
    createIdleMutationResult<CreateCliLoginCodeResponse, Error, void>({
      mutate,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    });

  const succeededMutation = (
    data: CreateCliLoginCodeResponse,
    mutate = vi.fn(),
  ) =>
    createSuccessMutationResult<CreateCliLoginCodeResponse, Error, void>({
      data,
      variables: undefined,
      mutate,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateCliLoginCodeMutation.mockReturnValue(idleMutation());
  });

  describe('when mounting', () => {
    it('automatically generates install command', () => {
      const mutateMock = vi.fn();
      mockUseCreateCliLoginCodeMutation.mockReturnValue(
        idleMutation(mutateMock),
      );

      renderWithQueryClient(<SetupLocalEnvironment />);

      expect(mutateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when generating command', () => {
    it('displays loading state', () => {
      mockUseCreateCliLoginCodeMutation.mockReturnValue(
        createPendingMutationResult<CreateCliLoginCodeResponse, Error, void>({
          variables: undefined,
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          reset: vi.fn(),
        }),
      );

      renderWithQueryClient(<SetupLocalEnvironment />);

      expect(
        screen.getByText('Generating install command...'),
      ).toBeInTheDocument();
    });
  });

  describe('when command is successfully generated', () => {
    const mockCode = 'test-login-code-123';
    const mockExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    beforeEach(() => {
      mockUseCreateCliLoginCodeMutation.mockReturnValue(
        succeededMutation({ code: mockCode, expiresAt: mockExpiresAt }),
      );

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
      const mutateMock = vi.fn();
      const mockCode = 'test-login-code-123';
      const mockExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

      mockUseCreateCliLoginCodeMutation.mockReturnValue(
        succeededMutation(
          { code: mockCode, expiresAt: mockExpiresAt },
          mutateMock,
        ),
      );

      renderWithQueryClient(<SetupLocalEnvironment />);

      const button = screen.getByText('Generate New Command');
      fireEvent.click(button);

      expect(mutateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when generation fails', () => {
    const mockError = new Error('Failed to generate code');

    beforeEach(() => {
      mockUseCreateCliLoginCodeMutation.mockReturnValue(
        createFailedMutationResult<CreateCliLoginCodeResponse, Error, void>({
          error: mockError,
          variables: undefined,
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          reset: vi.fn(),
        }),
      );

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
