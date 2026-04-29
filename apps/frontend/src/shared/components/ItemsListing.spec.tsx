import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PMTableRow, UIProvider } from '@packmind/ui';
import { ItemsListing, Item, ItemsListingProps } from './ItemsListing';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ItemsListing', () => {
  const items: Item[] = [
    { id: '123', name: 'First item' },
    { id: '456', name: 'Second item' },
    { id: '789', name: 'Third item' },
    { id: '987', name: 'Third item (copy)' },
  ];

  function renderListing() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const props: ItemsListingProps<Item> = {
      items,
      batchActions: [],
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
    it('selects all items', async () => {
      renderListing();

      await selectAll();

      expect(getRows()).toEqual([
        { name: 'First item', checked: true },
        { name: 'Second item', checked: true },
        { name: 'Third item', checked: true },
        { name: 'Third item (copy)', checked: true },
      ]);
    });
  });

  describe('when user uses the search field', () => {
    it('only shows the matching items', async () => {
      renderListing();

      await search('Third item');

      expect(getRows()).toEqual([
        { name: 'Third item', checked: false },
        { name: 'Third item (copy)', checked: false },
      ]);
    });

    describe('when user clicks the "Check all" checkbox', () => {
      it('only selects the filtered items', async () => {
        renderListing();

        await search('Third');
        await selectAll();
        await search('');

        expect(getRows()).toEqual([
          { name: 'First item', checked: false },
          { name: 'Second item', checked: false },
          { name: 'Third item', checked: true },
          { name: 'Third item (copy)', checked: true },
        ]);
      });
    });
  });
});
