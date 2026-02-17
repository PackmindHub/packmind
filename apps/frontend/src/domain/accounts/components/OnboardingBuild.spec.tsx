import React from 'react';
import { render, screen, within } from '@testing-library/react';
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

const mockIsLocalhost = jest.fn();
jest.mock('../../../shared/utils/isLocalhost', () => ({
  isLocalhost: () => mockIsLocalhost(),
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
    mockIsLocalhost.mockReturnValue(false);
  });

  describe('rendering', () => {
    it('renders the title', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByText('Build my playbook')).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(
        screen.getByText(/Analyze your local repository/),
      ).toBeInTheDocument();
    });

    it('renders the MCP card', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByTestId('OnboardingBuild.MCPCard')).toBeInTheDocument();
    });
  });

  describe('CLI section', () => {
    it('renders the Install tabs', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByText('Script (Mac/Linux)')).toBeInTheDocument();
      expect(screen.getByText('NPM (all OS)')).toBeInTheDocument();
    });

    it('renders the Initialize section', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByText('Initialize')).toBeInTheDocument();
    });

    it('renders the Start analysis section', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByText('Start analysis')).toBeInTheDocument();
    });
  });

  describe('MCP section', () => {
    it('renders the coding assistant options', () => {
      renderWithProviders(<OnboardingBuild />);

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
      renderWithProviders(<OnboardingBuild />);

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

        renderWithProviders(<OnboardingBuild />);

        expect(
          screen.getByTestId('OnboardingBuild.McpLoading'),
        ).toBeInTheDocument();
      });
    });

    describe('when user clicks on an agent', () => {
      it('hides the placeholder text', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingBuild />);

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
        renderWithProviders(<OnboardingBuild />);

        await user.click(
          screen.getByTestId('OnboardingBuild.Assistant-claude'),
        );

        expect(
          screen.getByTestId('OnboardingBuild.InstructionsContent').textContent,
        ).not.toBe('');
      });

      it('shows the Start analysis section header', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingBuild />);

        await user.click(
          screen.getByTestId('OnboardingBuild.Assistant-claude'),
        );

        const mcpCard = screen.getByTestId('OnboardingBuild.MCPCard');
        expect(within(mcpCard).getByText('Start analysis')).toBeInTheDocument();
      });

      it('shows the onboarding prompt textarea', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingBuild />);

        await user.click(
          screen.getByTestId('OnboardingBuild.Assistant-claude'),
        );

        expect(
          screen.getByTestId('OnboardingBuild.OnboardingPrompt'),
        ).toBeInTheDocument();
      });

      it('contains the correct onboarding prompt text', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingBuild />);

        await user.click(
          screen.getByTestId('OnboardingBuild.Assistant-claude'),
        );

        const promptTextarea = screen.getByTestId(
          'OnboardingBuild.OnboardingPrompt',
        );
        expect(promptTextarea).toHaveValue('Start the Packmind onboarding');
      });
    });

    describe('when no agent is selected', () => {
      it('does not show the onboarding prompt textarea', () => {
        renderWithProviders(<OnboardingBuild />);

        expect(
          screen.queryByTestId('OnboardingBuild.OnboardingPrompt'),
        ).not.toBeInTheDocument();
      });
    });
  });
});
