import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { UIProvider } from '@packmind/ui';
import userEvent from '@testing-library/user-event';
import { TestActiveVersionSection } from './TestActiveVersionSection';

describe('TestActiveVersionSection', () => {
  let screen: RenderResult;
  let onTestClick: jest.Mock;

  beforeEach(() => {
    onTestClick = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderWithContext() {
    return render(
      <UIProvider>
        <TestActiveVersionSection onTestClick={onTestClick} />
      </UIProvider>,
    );
  }

  describe('when rendered', () => {
    beforeEach(() => {
      screen = renderWithContext();
    });

    it('shows "Test active version" heading', () => {
      expect(screen.getByText(/Test active version/i)).toBeInTheDocument();
    });

    it('shows description about testing current linter configuration', () => {
      expect(
        screen.getByText(/Test current linter configuration/i),
      ).toBeInTheDocument();
    });

    it('shows "Test" button', () => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    describe('when "Test" button is clicked', () => {
      it('calls onTestClick', async () => {
        const user = userEvent.setup();
        const button = screen.getByText('Test');

        await user.click(button);

        expect(onTestClick).toHaveBeenCalledTimes(1);
      });
    });
  });
});
