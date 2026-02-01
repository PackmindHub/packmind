import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnboardingBuild } from './OnboardingBuild';

jest.mock('./LocalEnvironmentSetup/hooks/useCliLoginCode', () => ({
  useCliLoginCode: () => ({
    loginCode: 'test-login-code',
    codeExpiresAt: new Date(Date.now() + 600000).toISOString(),
    isGenerating: false,
    regenerate: jest.fn(),
  }),
}));

const mockUseMcpConnection = jest.fn();
jest.mock('./LocalEnvironmentSetup/hooks/useMcpConnection', () => ({
  useMcpConnection: () => mockUseMcpConnection(),
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

describe('OnboardingBuild', () => {
  const defaultProps = {
    onComplete: jest.fn(),
    onPrevious: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMcpConnection.mockReturnValue({
      url: 'https://mcp.test.packmind.ai/mcp',
      token: 'test-mcp-token',
      isLoading: false,
      isReady: true,
      isError: false,
      errorMessage: null,
    });
  });

  describe('rendering', () => {
    it('renders the title', () => {
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      expect(screen.getByText('Build my playbook')).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      expect(
        screen.getByText(/Analyze your local repository/),
      ).toBeInTheDocument();
    });

    it('renders the CLI card', () => {
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      expect(screen.getByTestId('OnboardingBuild.CLICard')).toBeInTheDocument();
    });

    it('renders the MCP card', () => {
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      expect(screen.getByTestId('OnboardingBuild.MCPCard')).toBeInTheDocument();
    });

    it('renders the status text', () => {
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      expect(
        screen.getByText('Waiting for your playbook to be ready...'),
      ).toBeInTheDocument();
    });
  });

  describe('CLI section', () => {
    it('renders the Install tabs', () => {
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      expect(screen.getByText('Script')).toBeInTheDocument();
      expect(screen.getByText('NPM')).toBeInTheDocument();
    });

    it('renders the Initialize section', () => {
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      expect(screen.getByText('Initialize')).toBeInTheDocument();
    });

    it('renders the Start analysis section', () => {
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      expect(screen.getByText('Start analysis')).toBeInTheDocument();
    });
  });

  describe('MCP section', () => {
    it('renders the coding assistant options', () => {
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      expect(
        screen.getByTestId('OnboardingBuild.Assistant-claude'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('OnboardingBuild.Assistant-cursor'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('OnboardingBuild.Assistant-github-copilot-vscode'),
      ).toBeInTheDocument();
    });

    it('renders the Instructions section', () => {
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      expect(screen.getByText('Instructions')).toBeInTheDocument();
    });

    describe('when MCP connection is loading', () => {
      it('renders a loading spinner', () => {
        mockUseMcpConnection.mockReturnValue({
          url: undefined,
          token: undefined,
          isLoading: true,
          isReady: false,
          isError: false,
          errorMessage: null,
        });

        renderWithProviders(<OnboardingBuild {...defaultProps} />);

        expect(
          screen.getByTestId('OnboardingBuild.McpLoading'),
        ).toBeInTheDocument();
      });
    });

    describe('when user clicks on an agent', () => {
      it('hides the placeholder text', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingBuild {...defaultProps} />);

        await user.click(
          screen.getByTestId('OnboardingBuild.Assistant-claude'),
        );

        expect(
          screen.queryByText(
            'Select a coding assistant above to see setup instructions.',
          ),
        ).not.toBeInTheDocument();
      });

      it('shows method content for the selected agent', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingBuild {...defaultProps} />);

        await user.click(
          screen.getByTestId('OnboardingBuild.Assistant-claude'),
        );

        expect(
          screen.getByTestId('OnboardingBuild.InstructionsContent').textContent,
        ).not.toBe('');
      });
    });
  });

  describe('when user clicks Previous', () => {
    it('calls onPrevious', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      await user.click(screen.getByTestId('OnboardingBuild.PreviousButton'));

      expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
    });
  });

  describe("when user clicks I'm done", () => {
    it('calls onComplete', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OnboardingBuild {...defaultProps} />);

      await user.click(screen.getByTestId('OnboardingBuild.CompleteButton'));

      expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
    });
  });
});
