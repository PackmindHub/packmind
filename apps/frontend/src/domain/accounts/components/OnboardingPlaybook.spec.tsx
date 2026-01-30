import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { OnboardingPlaybook } from './OnboardingPlaybook';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <UIProvider>{component}</UIProvider>
    </MemoryRouter>,
  );
};

describe('OnboardingPlaybook', () => {
  const mockOnBuildPlaybook = jest.fn();
  const mockOnPrevious = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when rendering the component', () => {
    beforeEach(() => {
      renderWithProviders(
        <OnboardingPlaybook
          onBuildPlaybook={mockOnBuildPlaybook}
          onPrevious={mockOnPrevious}
        />,
      );
    });

    it('displays title', () => {
      expect(
        screen.getByText('Build and evolve your playbook'),
      ).toBeInTheDocument();
    });

    it('displays subtitle', () => {
      expect(
        screen.getByText(
          /A Playbook is where your engineering knowledge lives/,
        ),
      ).toBeInTheDocument();
    });

    it('displays Standards card', () => {
      expect(screen.getByText('Standards')).toBeInTheDocument();
      expect(
        screen.getByText('Rules the AI should always follow.'),
      ).toBeInTheDocument();
    });

    it('displays Commands card', () => {
      expect(screen.getByText('Commands')).toBeInTheDocument();
      expect(
        screen.getByText('Reusable prompts the AI can execute.'),
      ).toBeInTheDocument();
    });

    it('displays Skills card', () => {
      expect(screen.getByText('Skills')).toBeInTheDocument();
      expect(
        screen.getByText('Expert modules for recurring needs.'),
      ).toBeInTheDocument();
    });

    it('displays Build my playbook button', () => {
      expect(
        screen.getByTestId('OnboardingPlaybook.BuildButton'),
      ).toBeInTheDocument();
    });

    it('displays Previous button', () => {
      expect(
        screen.getByTestId('OnboardingPlaybook.PreviousButton'),
      ).toBeInTheDocument();
    });
  });

  describe('when clicking Build my playbook button', () => {
    it('calls onBuildPlaybook', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <OnboardingPlaybook
          onBuildPlaybook={mockOnBuildPlaybook}
          onPrevious={mockOnPrevious}
        />,
      );

      await user.click(screen.getByTestId('OnboardingPlaybook.BuildButton'));

      expect(mockOnBuildPlaybook).toHaveBeenCalled();
    });
  });

  describe('when clicking Previous button', () => {
    it('calls onPrevious', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <OnboardingPlaybook
          onBuildPlaybook={mockOnBuildPlaybook}
          onPrevious={mockOnPrevious}
        />,
      );

      await user.click(screen.getByTestId('OnboardingPlaybook.PreviousButton'));

      expect(mockOnPrevious).toHaveBeenCalled();
    });
  });
});
