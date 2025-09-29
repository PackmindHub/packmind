import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClient,
  QueryClientProvider,
  UseMutationResult,
} from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { McpConfig } from './McpConfig';
import { useGetMcpTokenMutation } from '../api/queries/AuthQueries';
import { TokenResponse } from '../api/gateways';
import { UIProvider } from '@packmind/ui';

// Mock the useGetMcpTokenMutation hook
jest.mock('../api/queries/AuthQueries', () => ({
  useGetMcpTokenMutation: jest.fn(),
  useGetMcpURLQuery: jest.fn(() => ({
    data: { url: 'https://mcp.packmind.com' },
  })),
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

const mockUseGetMcpTokenMutation =
  useGetMcpTokenMutation as jest.MockedFunction<typeof useGetMcpTokenMutation>;

// Helper function to create complete mock mutation objects
const createMockMutation = (
  overrides: object = {},
): UseMutationResult<TokenResponse, Error, void, unknown> => ({
  mutate: jest.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  data: undefined,
  error: null,
  variables: undefined,
  isIdle: true,
  status: 'idle' as const,
  reset: jest.fn(),
  mutateAsync: jest.fn(),
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  submittedAt: 0,
  context: {},
  ...overrides,
});

describe('McpConfig', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithQueryClient = async (component: React.ReactElement) => {
    let renderResult;
    await act(async () => {
      renderResult = render(
        <UIProvider>
          <QueryClientProvider client={queryClient}>
            {component}
          </QueryClientProvider>
        </UIProvider>,
      );
    });

    // Wait for any async state updates from Chakra UI/Zag.js components to complete
    await waitFor(() => {
      // This ensures all async operations have completed
      expect(screen.getByText('MCP Access Token')).toBeInTheDocument();
    });

    return renderResult;
  };

  describe('when component is rendered', () => {
    it('displays the MCP Access Token section', async () => {
      const mockMutation = createMockMutation();
      mockUseGetMcpTokenMutation.mockReturnValue(mockMutation);

      await renderWithQueryClient(<McpConfig />);

      expect(screen.getByText('MCP Access Token')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Generate an access token for MCP (Model Context Protocol) integration.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Get MCP Access Token')).toBeInTheDocument();
    });
  });

  describe('when get token button is clicked', () => {
    it('calls the mutation', async () => {
      const user = userEvent.setup();
      const mockMutation = createMockMutation();
      mockUseGetMcpTokenMutation.mockReturnValue(mockMutation);

      await renderWithQueryClient(<McpConfig />);

      const button = screen.getByText('Get MCP Access Token');
      await user.click(button);

      expect(mockMutation.mutate).toHaveBeenCalled();
    });
  });

  describe('when mutation is pending', () => {
    it('shows loading state', async () => {
      const mockMutation = createMockMutation({
        isPending: true,
        status: 'pending',
      });
      mockUseGetMcpTokenMutation.mockReturnValue(mockMutation);

      await renderWithQueryClient(<McpConfig />);

      expect(screen.getByText('Getting Token...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('when mutation fails', () => {
    it('displays error message', async () => {
      const mockMutation = createMockMutation({
        isError: true,
        status: 'error',
        error: new Error('Failed to get token'),
      });
      mockUseGetMcpTokenMutation.mockReturnValue(mockMutation);

      await renderWithQueryClient(<McpConfig />);

      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Failed to get token')).toBeInTheDocument();
    });
  });

  describe('when mutation succeeds', () => {
    const mockTokenData = {
      access_token: 'test-token-123',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read write',
    };

    const expectedClassicConfig = {
      mcpServers: {
        packmind: {
          url: 'https://mcp.packmind.com',
          headers: {
            Authorization: 'Bearer test-token-123',
          },
        },
      },
    };

    const expectedVSCodeConfig = {
      servers: {
        'packmind-mcp-vscode': {
          url: 'https://mcp.packmind.com',
          type: 'http',
          headers: {
            Authorization: 'Bearer test-token-123',
          },
        },
      },
      inputs: [],
    };

    const expectedCliCommand =
      'claude mcp add packmind https://mcp.packmind.com --header "Authorization=Bearer test-token-123"';

    beforeEach(async () => {
      const mockMutation = createMockMutation({
        isSuccess: true,
        status: 'success',
        data: mockTokenData,
      });
      mockUseGetMcpTokenMutation.mockReturnValue(mockMutation);

      await renderWithQueryClient(<McpConfig />);
    });

    it('displays a message about successful generation', () => {
      expect(
        screen.getByText('Token Generated Successfully!'),
      ).toBeInTheDocument();
    });

    it('displays classic MCP configuration JSON', () => {
      const classicConfig = screen.getByTestId('mcp-config-classic');
      const config = JSON.parse(classicConfig.textContent ?? '{}');
      expect(config).toEqual(expectedClassicConfig);
    });

    it('displays VS Code MCP configuration JSON', () => {
      const vscodeConfig = screen.getByTestId('mcp-config-vscode');
      const config = JSON.parse(vscodeConfig.textContent ?? '{}');
      expect(config).toEqual(expectedVSCodeConfig);
    });

    it('displays Claude CLI command', () => {
      const cliConfig = screen.getByTestId('mcp-config-cli');
      expect(cliConfig.textContent).toBe(expectedCliCommand);
    });

    it('displays copy buttons for all configurations', () => {
      const copyButtons = screen.getAllByLabelText('Copy to clipboard');
      expect(copyButtons).toHaveLength(3);
    });
  });
});
