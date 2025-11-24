import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { UIProvider } from '@packmind/ui';
import userEvent from '@testing-library/user-event';
import { DetectabilitySection } from './DetectabilitySection';

describe('DetectabilitySection', () => {
  let screen: RenderResult;
  let onLinterUsageClick: jest.Mock;

  beforeEach(() => {
    onLinterUsageClick = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderWithContext() {
    return render(
      <UIProvider>
        <DetectabilitySection onLinterUsageClick={onLinterUsageClick} />
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

    it('shows "Linter usage" button', () => {
      expect(screen.getByText('Linter usage')).toBeInTheDocument();
    });

    it('calls onLinterUsageClick when "Linter usage" button is clicked', async () => {
      const user = userEvent.setup();
      const button = screen.getByText('Linter usage');

      await user.click(button);

      expect(onLinterUsageClick).toHaveBeenCalledTimes(1);
    });
  });
});
