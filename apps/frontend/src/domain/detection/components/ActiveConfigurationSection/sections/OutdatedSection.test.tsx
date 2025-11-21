import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { UIProvider } from '@packmind/ui';
import userEvent from '@testing-library/user-event';
import { OutdatedSection } from './OutdatedSection';

describe('OutdatedSection', () => {
  let screen: RenderResult;
  let onGenerateProgramClick: jest.Mock;

  beforeEach(() => {
    onGenerateProgramClick = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderWithContext(isGenerating = false) {
    return render(
      <UIProvider>
        <OutdatedSection
          onGenerateProgramClick={onGenerateProgramClick}
          isGenerating={isGenerating}
        />
      </UIProvider>,
    );
  }

  describe('when rendered', () => {
    beforeEach(() => {
      screen = renderWithContext();
    });

    it('shows "Program is outdated" heading', () => {
      expect(screen.getByText(/Program is outdated/i)).toBeInTheDocument();
    });

    it('shows message about active version not matching rule specifications', () => {
      expect(
        screen.getByText(/Active version of the program does not match/i),
      ).toBeInTheDocument();
    });

    it('shows "Code examples have changed" bullet point', () => {
      expect(
        screen.getByText(/Code examples have changed/i),
      ).toBeInTheDocument();
    });

    it('shows "Detectability clues have changed" bullet point', () => {
      expect(
        screen.getByText(/Detectability clues have changed/i),
      ).toBeInTheDocument();
    });

    it('shows "Generate new program" button', () => {
      expect(screen.getByText('Generate new program')).toBeInTheDocument();
    });

    it('calls onGenerateProgramClick when "Generate new program" button is clicked', async () => {
      const user = userEvent.setup();
      const button = screen.getByText('Generate new program');

      await user.click(button);

      expect(onGenerateProgramClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('when isGenerating is true', () => {
    beforeEach(() => {
      screen = renderWithContext(true);
    });

    it('disables the "Generate new program" button', () => {
      const button = screen.getByText('Generate new program').closest('button');
      expect(button).toBeDisabled();
    });
  });
});
