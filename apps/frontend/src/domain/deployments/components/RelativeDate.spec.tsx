import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { RelativeDate } from './RelativeDate';

describe('RelativeDate', () => {
  const renderDate = (iso: string) =>
    render(
      <UIProvider>
        <RelativeDate iso={iso} testId="date" />
      </UIProvider>,
    );

  it('reads as the distance, which is what the line is for', () => {
    renderDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

    expect(screen.getByTestId('date')).toHaveTextContent('3 days ago');
  });

  describe('when the reader asks for the date itself', () => {
    it('names it on the hover', async () => {
      renderDate('2026-06-10T12:00:00.000Z');

      await userEvent.hover(screen.getByTestId('date'));

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Jun 10, 2026',
      );
    });
  });

  describe('when the value is not a date', () => {
    it('prints what it was given rather than hovering "Invalid date" over it', () => {
      renderDate('not-a-date');

      expect(screen.getByText('not-a-date')).toBeInTheDocument();
      expect(screen.queryByTestId('date')).not.toBeInTheDocument();
    });
  });
});
