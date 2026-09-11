import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UIProvider } from '@packmind/ui';
import { SelectionBar } from './SelectionBar';

describe('SelectionBar', () => {
  const renderBar = (props: Partial<Parameters<typeof SelectionBar>[0]>) =>
    render(
      <UIProvider>
        <SelectionBar
          count={2}
          actions={[]}
          onClear={vi.fn()}
          {...(props as Parameters<typeof SelectionBar>[0])}
        />
      </UIProvider>,
    );

  it('counts what is picked', () => {
    renderBar({ count: 3 });

    expect(screen.getByText('3 selected')).toBeVisible();
  });

  describe('when the list is showing more than is picked', () => {
    it('offers the rest of it', async () => {
      const onSelectAll = vi.fn();
      renderBar({ count: 2, total: 40, onSelectAll });

      await userEvent.click(
        screen.getByRole('button', { name: 'Select all 40' }),
      );

      expect(onSelectAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('when everything shown is picked', () => {
    it('drops the offer rather than disabling it', () => {
      renderBar({ count: 40, total: 40, onSelectAll: vi.fn() });

      expect(screen.queryByRole('button', { name: /Select all/ })).toBeNull();
    });
  });

  describe('when the caller offers no bulk pick', () => {
    it('says nothing about it, whatever the counts', () => {
      renderBar({ count: 2, total: 40 });

      expect(screen.queryByRole('button', { name: /Select all/ })).toBeNull();
    });
  });
});
