import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UIProvider } from '@packmind/ui';
import { SelectionBar } from './SelectionBar';

describe('SelectionBar', () => {
  const renderBar = (props: Partial<Parameters<typeof SelectionBar>[0]>) =>
    render(
      <UIProvider>
        <SelectionBar count={2} actions={[]} onClear={vi.fn()} {...props} />
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

      expect(
        screen.queryByRole('button', { name: 'Select all 40' }),
      ).toBeNull();
    });
  });

  describe('when the caller offers no bulk pick', () => {
    it('says nothing about it, whatever the counts', () => {
      renderBar({ count: 2, total: 40 });

      expect(
        screen.queryByRole('button', { name: 'Select all 40' }),
      ).toBeNull();
    });
  });

  /*
   * The bar's third action and everything after it. Two gestures fit beside the
   * count; a third turned the right-hand group into a row of equal-weight
   * buttons with a destructive one among them, which is the arrangement the
   * package header above this list already rejected.
   */
  describe('actions behind the menu', () => {
    it('keeps them off the bar', () => {
      renderBar({
        actions: [{ label: 'Move', icon: <span />, onAct: vi.fn() }],
        overflow: [{ label: 'Delete', icon: <span />, onAct: vi.fn() }],
      });

      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Move' })).toBeVisible();
    });

    it('acts when one is picked from it', async () => {
      const onAct = vi.fn();
      renderBar({
        overflow: [{ label: 'Delete', icon: <span />, onAct }],
      });

      await userEvent.click(
        screen.getByRole('button', { name: 'More actions for the selection' }),
      );
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

      expect(onAct).toHaveBeenCalledTimes(1);
    });

    describe('when the caller has none', () => {
      it('draws no menu at all', () => {
        renderBar({
          actions: [{ label: 'Move', icon: <span />, onAct: vi.fn() }],
        });

        expect(
          screen.queryByRole('button', {
            name: 'More actions for the selection',
          }),
        ).toBeNull();
      });
    });
  });

  /*
   * The half that was reported missing. It was there, at the far end of the
   * bar behind the actions, which is not where a reader looks for the way out
   * of a selection they made at the near end.
   */
  describe('dropping the selection', () => {
    it('offers it beside the count, not among the actions', () => {
      renderBar({
        count: 2,
        actions: [{ label: 'Distribute', icon: <span />, onAct: vi.fn() }],
      });

      const buttons = screen.getAllByRole('button').map((b) => b.textContent);

      expect(buttons.indexOf('Unselect all')).toBeLessThan(
        buttons.indexOf('Distribute'),
      );
    });

    it('drops what is picked', async () => {
      const onClear = vi.fn();
      renderBar({ count: 2, onClear });

      await userEvent.click(
        screen.getByRole('button', { name: 'Unselect all' }),
      );

      expect(onClear).toHaveBeenCalledTimes(1);
    });

    /*
     * Where `Select all` goes once there is nothing left to pick: the bar is
     * drawn only while something is picked, so this one never runs out.
     */
    it('stays offered once everything shown is picked', () => {
      renderBar({ count: 40, total: 40, onSelectAll: vi.fn() });

      expect(
        screen.getByRole('button', { name: 'Unselect all' }),
      ).toBeVisible();
    });
  });
});
