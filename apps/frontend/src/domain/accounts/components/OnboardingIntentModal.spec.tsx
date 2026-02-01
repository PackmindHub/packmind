import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnboardingIntentModal } from './OnboardingIntentModal';

jest.mock('./LocalEnvironmentSetup/hooks/useCliLoginCode', () => ({
  useCliLoginCode: () => ({
    loginCode: 'test-login-code',
    codeExpiresAt: new Date(Date.now() + 600000).toISOString(),
    isGenerating: false,
    regenerate: jest.fn(),
  }),
}));

jest.mock('./LocalEnvironmentSetup/hooks/useMcpConnection', () => ({
  useMcpConnection: () => ({
    url: 'https://mcp.test.com',
    token: 'test-token',
    isLoading: false,
  }),
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

describe('OnboardingIntentModal', () => {
  const defaultProps = {
    open: true,
    onComplete: jest.fn(),
    onSkip: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when open', () => {
    it('renders the welcome step by default', () => {
      renderWithProviders(<OnboardingIntentModal {...defaultProps} />);

      expect(screen.getByText('Welcome to Packmind')).toBeInTheDocument();
    });
  });

  describe('when closed', () => {
    it('does not render modal content', () => {
      renderWithProviders(
        <OnboardingIntentModal {...defaultProps} open={false} />,
      );

      expect(screen.queryByText('Welcome to Packmind')).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    describe('when user clicks Discover', () => {
      it('navigates to playbook step', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingIntentModal {...defaultProps} />);

        await user.click(
          screen.getByTestId('OnboardingWelcome.DiscoverButton'),
        );

        expect(
          screen.getByText('Build and evolve your playbook'),
        ).toBeInTheDocument();
      });
    });

    describe('when user clicks Previous on playbook step', () => {
      it('navigates back to welcome step', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingIntentModal {...defaultProps} />);

        await user.click(
          screen.getByTestId('OnboardingWelcome.DiscoverButton'),
        );
        await user.click(
          screen.getByTestId('OnboardingPlaybook.PreviousButton'),
        );

        expect(screen.getByText('Welcome to Packmind')).toBeInTheDocument();
      });
    });

    describe('when user clicks Build my playbook', () => {
      it('navigates to build step', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingIntentModal {...defaultProps} />);

        await user.click(
          screen.getByTestId('OnboardingWelcome.DiscoverButton'),
        );
        await user.click(screen.getByTestId('OnboardingPlaybook.BuildButton'));

        expect(screen.getByText('Build my playbook')).toBeInTheDocument();
      });
    });

    describe('when user clicks Previous on build step', () => {
      it('navigates back to playbook step', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingIntentModal {...defaultProps} />);

        await user.click(
          screen.getByTestId('OnboardingWelcome.DiscoverButton'),
        );
        await user.click(screen.getByTestId('OnboardingPlaybook.BuildButton'));
        await user.click(screen.getByTestId('OnboardingBuild.PreviousButton'));

        expect(
          screen.getByText('Build and evolve your playbook'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('completion callbacks', () => {
    describe("when user clicks I'm done on build step", () => {
      it('calls onComplete', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingIntentModal {...defaultProps} />);

        await user.click(
          screen.getByTestId('OnboardingWelcome.DiscoverButton'),
        );
        await user.click(screen.getByTestId('OnboardingPlaybook.BuildButton'));
        await user.click(screen.getByTestId('OnboardingBuild.CompleteButton'));

        expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
      });
    });

    describe('when user clicks skip link', () => {
      it('calls onSkip', async () => {
        const user = userEvent.setup();
        renderWithProviders(<OnboardingIntentModal {...defaultProps} />);

        await user.click(screen.getByTestId('OnboardingWelcome.SkipLink'));

        expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
      });
    });
  });
});
