import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PMButton, PMTableRow, UIProvider } from '@packmind/ui';
import { ItemsListing, Item, ItemsListingProps } from './ItemsListing';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ItemsListing', () => {
  const items: Item[] = [
    { id: 'item-id-1', name: 'First item' },
    { id: 'item-id-2', name: 'Second item' },
    { id: 'item-id-3', name: 'Third item' },
    { id: 'item-id-3-copy', name: 'Third item (copy)' },
  ];

  let batchActionSpy: (selectedIds: string[]) => void;

  beforeEach(() => {
    batchActionSpy = jest.fn();
  });

  function renderListing() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const props: ItemsListingProps<Item> = {
      items,
      batchActions: [
        ({ selectedIds }) => (
          <PMButton
            children={<>Do something</>}
            onClick={() => batchActionSpy(selectedIds)}
          />
        ),
      ],
      columns: [{ key: 'name', header: 'Name' }],
      makeTableData: function (item): PMTableRow {
        return {
          name: <p>{item.name}</p>,
        };
      },
      sortItems: function (items) {
        return items;
      },
      matchQuery: function (searchQuery, item): boolean {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase());
      },
    };

    return render(
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          <ItemsListing {...props} />
        </QueryClientProvider>
      </UIProvider>,
    );
  }

  async function search(value: string) {
    const searchInput = screen.getByPlaceholderText('Search by name...');

    return act(async () => {
      fireEvent.change(searchInput, { target: { value } });
    });
  }

  async function selectAll() {
    const checkboxes = screen.getAllByRole('checkbox');
    const headerCheckbox = checkboxes[0];

    return act(async () => {
      fireEvent.click(headerCheckbox);
    });
  }

  function getRows(): { name: string; checked: boolean }[] {
    return screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => {
        const checkbox = row.querySelector<HTMLInputElement>(
          'input[type="checkbox"]',
        );
        const nameCells = row.querySelectorAll('td');
        const nameCell = nameCells[nameCells.length - 1];

        return {
          name: nameCell?.textContent ?? '',
          checked: checkbox?.checked ?? false,
        };
      });
  }

  describe('when user clicks the "Check all" checkbox', () => {
    beforeEach(async () => {
      renderListing();

      await selectAll();
    });

    it('selects all items', async () => {
      expect(getRows()).toEqual([
        { name: 'First item', checked: true },
        { name: 'Second item', checked: true },
        { name: 'Third item', checked: true },
        { name: 'Third item (copy)', checked: true },
      ]);
    });

    describe('when user triggers a batch action', () => {
      it('calls the actions with the items matching ids', async () => {
        const action = screen.getByRole('button', { name: 'Do something' });

        await act(async () => {
          fireEvent.click(action);
        });

        expect(batchActionSpy).toHaveBeenCalledWith([
          'item-id-1',
          'item-id-2',
          'item-id-3',
          'item-id-3-copy',
        ]);
      });
    });
  });

  describe('when user uses the search field', () => {
    beforeEach(async () => {
      renderListing();

      await search('Third');
    });

    it('only shows the matching items', async () => {
      expect(getRows()).toEqual([
        { name: 'Third item', checked: false },
        { name: 'Third item (copy)', checked: false },
      ]);
    });

    describe('when user clicks the "Check all" checkbox', () => {
      beforeEach(async () => {
        await selectAll();
      });

      it('only selects the filtered items', async () => {
        await search('');

        expect(getRows()).toEqual([
          { name: 'First item', checked: false },
          { name: 'Second item', checked: false },
          { name: 'Third item', checked: true },
          { name: 'Third item (copy)', checked: true },
        ]);
      });

      describe('when user triggers a batch action', () => {
        it('calls the actions with the items matching ids', async () => {
          const action = screen.getByRole('button', { name: 'Do something' });

          await act(async () => {
            fireEvent.click(action);
          });

          expect(batchActionSpy).toHaveBeenCalledWith([
            'item-id-3',
            'item-id-3-copy',
          ]);
        });
      });
    });
  });
});
