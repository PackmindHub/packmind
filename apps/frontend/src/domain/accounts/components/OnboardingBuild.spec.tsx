import React from 'react';
import { render, screen } from '@testing-library/react';
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
    mockIsLocalhost.mockReturnValue(false);
  });

  describe('rendering', () => {
    it('renders the title', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByText('Build my playbook')).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByText(/Install the Packmind CLI/)).toBeInTheDocument();
    });
  });

  describe('CLI section', () => {
    it('renders the install sections', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByText('Guided install')).toBeInTheDocument();
      expect(screen.getByText('Alternative')).toBeInTheDocument();
    });

    it('renders the Initialize step', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByText('Initialize your project')).toBeInTheDocument();
    });

    it('renders the Start analysis step', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByText('Start analysis')).toBeInTheDocument();
    });

    it('renders the step numbers', () => {
      renderWithProviders(<OnboardingBuild />);

      expect(screen.getByText('Install the CLI')).toBeInTheDocument();
      expect(screen.getByText('Initialize your project')).toBeInTheDocument();
      expect(screen.getByText('Start analysis')).toBeInTheDocument();
    });
  });
});
