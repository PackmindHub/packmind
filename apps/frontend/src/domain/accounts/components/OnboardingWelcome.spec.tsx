import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { OnboardingWelcome } from './OnboardingWelcome';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <UIProvider>{component}</UIProvider>
    </MemoryRouter>,
  );
};

describe('OnboardingWelcome', () => {
  const mockOnDiscover = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when rendering the component', () => {
    beforeEach(() => {
      renderWithProviders(
        <OnboardingWelcome onDiscover={mockOnDiscover} onSkip={mockOnSkip} />,
      );
    });

    it('displays welcome title', () => {
      expect(screen.getByText('Welcome to Packmind')).toBeInTheDocument();
    });

    it('displays subtitle', () => {
      expect(
        screen.getByText('Train AI agents to code right'),
      ).toBeInTheDocument();
    });

    it('displays Discover button', () => {
      expect(
        screen.getByTestId('OnboardingWelcome.DiscoverButton'),
      ).toBeInTheDocument();
    });

    it('displays skip link', () => {
      expect(
        screen.getByTestId('OnboardingWelcome.SkipLink'),
      ).toBeInTheDocument();
    });

    it('displays knowledge centralization card', () => {
      expect(
        screen.getByText('Your knowledge in one place'),
      ).toBeInTheDocument();
    });

    it('displays AI-friendly docs card', () => {
      expect(screen.getByText('AI-friendly documentation')).toBeInTheDocument();
    });

    it('displays GenAI at scale card', () => {
      expect(screen.getByText('GenAI at scale')).toBeInTheDocument();
    });
  });

  describe('when clicking Discover button', () => {
    it('calls onDiscover', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <OnboardingWelcome onDiscover={mockOnDiscover} onSkip={mockOnSkip} />,
      );

      await user.click(screen.getByTestId('OnboardingWelcome.DiscoverButton'));

      expect(mockOnDiscover).toHaveBeenCalled();
    });
  });

  describe('when clicking skip link', () => {
    it('calls onSkip', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <OnboardingWelcome onDiscover={mockOnDiscover} onSkip={mockOnSkip} />,
      );

      await user.click(screen.getByTestId('OnboardingWelcome.SkipLink'));

      expect(mockOnSkip).toHaveBeenCalled();
    });
  });
});
