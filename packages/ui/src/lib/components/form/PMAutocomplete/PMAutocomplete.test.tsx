import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UIProvider } from '../../../UIProvider';
import { PMAutocomplete, PMAutocompleteProps } from './PMAutocomplete';

const handlers = {
  onInputChange: jest.fn(),
  onPick: jest.fn(),
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

const renderAutocomplete = (props: Partial<PMAutocompleteProps> = {}) =>
  render(
    <UIProvider>
      <PMAutocomplete items={[]} {...handlers} {...props} />
    </UIProvider>,
  );

const input = () => screen.getByTestId('pm-autocomplete-input');

// Pasted rather than typed: the combobox writing the value back makes
// userEvent's simulated caret lose keystrokes.
const enterText = async (text: string) => {
  await userEvent.click(input());
  await userEvent.paste(text);
};

const options = () =>
  screen
    .queryAllByTestId('pm-autocomplete-option')
    .map((option) => option.textContent);

describe('PMAutocomplete', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the user types', () => {
    beforeEach(async () => {
      renderAutocomplete({ items: ['dev', 'develop'] });
      await enterText('de');
      await screen.findAllByTestId('pm-autocomplete-option');
    });

    it('reports the typed text', () => {
      expect(handlers.onInputChange).toHaveBeenLastCalledWith('de');
    });

    it('lists the items', () => {
      expect(options()).toEqual(['dev', 'develop']);
    });

    it('emphasises the typed text in each item', () => {
      expect(
        screen.getAllByTestId('pm-autocomplete-option-match')[1],
      ).toHaveTextContent(/^de$/);
    });

    describe('and clicks an item', () => {
      beforeEach(() => {
        fireEvent.click(screen.getAllByTestId('pm-autocomplete-option')[1]);
      });

      it('picks it', async () => {
        await waitFor(() =>
          expect(handlers.onPick).toHaveBeenCalledWith('develop'),
        );
      });
    });

    describe('and highlights an item and presses Enter', () => {
      beforeEach(async () => {
        await userEvent.keyboard('{ArrowDown}{Enter}');
      });

      it('picks the highlighted item', async () => {
        await waitFor(() =>
          expect(handlers.onPick).toHaveBeenCalledWith('dev'),
        );
      });

      it('does not confirm the typed text', () => {
        expect(handlers.onConfirm).not.toHaveBeenCalled();
      });
    });

    describe('and presses Escape twice', () => {
      beforeEach(async () => {
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(options()).toEqual([]));
        await userEvent.keyboard('{Escape}');
      });

      it('cancels only on the second press', () => {
        expect(handlers.onCancel).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when Enter is pressed with no item highlighted', () => {
    beforeEach(() => {
      renderAutocomplete();
      fireEvent.keyDown(input(), { key: 'Enter' });
    });

    it('confirms the typed text', () => {
      expect(handlers.onConfirm).toHaveBeenCalled();
    });
  });

  describe('when the items could not be loaded', () => {
    beforeEach(async () => {
      renderAutocomplete({ items: ['dev'], errorText: 'Could not load' });
      await enterText('de');
    });

    it('shows the error', () => {
      expect(
        screen.getByTestId('pm-autocomplete-search-error'),
      ).toHaveTextContent('Could not load');
    });

    it('lists no item', () => {
      expect(options()).toEqual([]);
    });
  });

  describe('when busy', () => {
    beforeEach(() => {
      renderAutocomplete({ busy: true });
    });

    it('shows a spinner', () => {
      expect(
        screen.getByTestId('pm-autocomplete-checking'),
      ).toBeInTheDocument();
    });

    it('disables cancelling', () => {
      expect(screen.getByTestId('pm-autocomplete-cancel')).toBeDisabled();
    });
  });

  describe('with a test id prefix', () => {
    beforeEach(() => {
      renderAutocomplete({ testIdPrefix: 'branch' });
    });

    it('prefixes every part', () => {
      expect(screen.getByTestId('branch-input')).toBeInTheDocument();
    });
  });
});
