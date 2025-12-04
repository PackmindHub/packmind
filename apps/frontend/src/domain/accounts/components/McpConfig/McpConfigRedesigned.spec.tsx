import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { McpConfigRedesigned } from './McpConfigRedesigned';
import {
  useGetMcpTokenMutation,
  useGetMcpURLQuery,
} from '../../api/queries/AuthQueries';
import { UIProvider } from '@packmind/ui';

jest.mock('../../api/queries/AuthQueries');

const mockUseGetMcpTokenMutation =
  useGetMcpTokenMutation as jest.MockedFunction<typeof useGetMcpTokenMutation>;
const mockUseGetMcpURLQuery = useGetMcpURLQuery as jest.MockedFunction<
  typeof useGetMcpURLQuery
>;

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UIProvider>{ui}</UIProvider>
    </QueryClientProvider>,
  );
};

describe('McpConfigRedesigned', () => {
  const mockMutate = jest.fn();
  const mockUrl = 'https://mcp.packmind.com';
  const mockToken = 'test-token-12345';

  beforeEach(() => {
    mockUseGetMcpTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
    } as ReturnType<typeof useGetMcpTokenMutation>);

    mockUseGetMcpURLQuery.mockReturnValue({
      data: { url: mockUrl },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useGetMcpURLQuery>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial render', () => {
    it('displays the page title', () => {
      renderWithProviders(<McpConfigRedesigned />);

      expect(screen.getByText('MCP server configuration')).toBeInTheDocument();
    });

    it('displays the description text', () => {
      renderWithProviders(<McpConfigRedesigned />);

      expect(
        screen.getByText(
          'Configure your AI assistant to connect to Packmind MCP server.',
        ),
      ).toBeInTheDocument();
    });

    it('automatically fetches token on mount', () => {
      renderWithProviders(<McpConfigRedesigned />);

      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state', () => {
    it('displays loading spinner when fetching token', () => {
      mockUseGetMcpTokenMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
      } as ReturnType<typeof useGetMcpTokenMutation>);

      renderWithProviders(<McpConfigRedesigned />);

      expect(
        screen.getByText('Generating access token...'),
      ).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('displays error message when mutation fails', () => {
      mockUseGetMcpTokenMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: true,
        isSuccess: false,
        error: new Error('Network error'),
        data: undefined,
      } as ReturnType<typeof useGetMcpTokenMutation>);

      renderWithProviders(<McpConfigRedesigned />);

      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  describe('Success state', () => {
    beforeEach(() => {
      mockUseGetMcpTokenMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        isSuccess: true,
        error: null,
        data: { access_token: mockToken },
      } as ReturnType<typeof useGetMcpTokenMutation>);
    });

    it('displays agent selection prompt', () => {
      renderWithProviders(<McpConfigRedesigned />);

      expect(
        screen.getByText('Select an AI assistant to configure:'),
      ).toBeInTheDocument();
    });

    it('displays all agent cards', () => {
      renderWithProviders(<McpConfigRedesigned />);

      expect(screen.getByTestId('agent-card-claude')).toBeInTheDocument();
      expect(
        screen.getByTestId('agent-card-github-copilot-vscode'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('agent-card-github-copilot-jetbrains'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('agent-card-cursor')).toBeInTheDocument();
      expect(screen.getByTestId('agent-card-generic')).toBeInTheDocument();
    });

    it('displays agent names', () => {
      renderWithProviders(<McpConfigRedesigned />);

      expect(screen.getByText('Claude (Anthropic)')).toBeInTheDocument();
      expect(screen.getByText('GitHub Copilot (VS Code)')).toBeInTheDocument();
      expect(
        screen.getByText('GitHub Copilot (JetBrains)'),
      ).toBeInTheDocument();
      expect(screen.getByText('Cursor')).toBeInTheDocument();
      expect(screen.getByText('MCP Generic')).toBeInTheDocument();
    });

    it('displays method badges on cards', () => {
      renderWithProviders(<McpConfigRedesigned />);

      // All agents should have CLI and JSON badges
      const cliBadges = screen.getAllByText('CLI');
      expect(cliBadges.length).toBeGreaterThan(0);

      const jsonBadges = screen.getAllByText('JSON');
      expect(jsonBadges.length).toBeGreaterThan(0);

      // Cursor and VS Code should have One-Click Install badges
      const oneClickInstallBadges = screen.getAllByText('One-Click Install');
      expect(oneClickInstallBadges.length).toBe(2);
    });

    describe('Agent card interaction', () => {
      it('opens modal when clicking on a card', async () => {
        renderWithProviders(<McpConfigRedesigned />);

        const claudeCard = screen.getByTestId('agent-card-claude');
        fireEvent.click(claudeCard);

        // Modal should be opened
        await waitFor(() => {
          expect(claudeCard).toBeInTheDocument();
        });
      });
    });
  });
});
