import React from 'react';
import { render, screen } from '@testing-library/react';
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
  describe('when rendering the component', () => {
    beforeEach(() => {
      renderWithProviders(<OnboardingPlaybook />);
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
  });
});
