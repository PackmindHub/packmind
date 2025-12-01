import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { UIProvider } from '@packmind/ui';
import { DetectabilitySection } from './DetectabilitySection';

describe('DetectabilitySection', () => {
  let screen: RenderResult;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderWithContext(standardName?: string) {
    return render(
      <UIProvider>
        <DetectabilitySection standardName={standardName} />
      </UIProvider>,
    );
  }

  describe('when rendered', () => {
    beforeEach(() => {
      screen = renderWithContext();
    });

    it('shows "Rule is detectable" message', () => {
      expect(screen.getByText(/Rule is detectable/i)).toBeInTheDocument();
    });

    it('shows description about Packmind linter detecting violations', () => {
      expect(
        screen.getByText(/Packmind linter will now detect violations/i),
      ).toBeInTheDocument();
    });

    it('shows "Linter usage" link', () => {
      expect(screen.getByText('Linter usage')).toBeInTheDocument();
    });

    it('renders "Linter usage" as a link to documentation', () => {
      const link = screen.getByRole('link', { name: 'Linter usage' });
      expect(link).toHaveAttribute(
        'href',
        'https://packmindhub.github.io/packmind/linter',
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('when standard name is provided', () => {
    beforeEach(() => {
      screen = renderWithContext('My Custom Standard');
    });

    it('displays the standard name in the description', () => {
      expect(
        screen.getByText(
          /Packmind linter will now detect violations of this rules in code where standard 'My Custom Standard' is deployed\./i,
        ),
      ).toBeInTheDocument();
    });
  });
});
