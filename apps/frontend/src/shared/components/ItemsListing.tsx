import * as React from 'react';
import {
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMInput,
  PMTable,
  PMTableColumn,
  PMTableRow,
  SortDirection,
  useTableSort,
} from '@packmind/ui';

export type Item = { id: string; name: string };

export type ItemsListingColumn = Omit<
  PMTableColumn,
  'sortable' | 'sortDirection'
> & {
  sortKey?: string;
};

export type ItemsListingProps<T extends Item> = {
  items: T[];
  batchActions: React.ReactNode;
  columns: ItemsListingColumn[];
  makeTableData: (item: T) => PMTableRow;
  sortItems: (
    items: T[],
    sortKey: string | null,
    sortDirection: SortDirection,
  ) => T[];
  matchQuery: (searchQuery: string, item: T) => boolean;
};

export function makeItemsListing<T extends Item>(props: ItemsListingProps<T>) {
  const ItemsListing: React.FunctionComponent<ItemsListingProps<T>> = (
    props,
  ) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [filteredIds, setFilteredIds] = React.useState<string[]>([]);

    const [filteredItems, setFilteredItems] = React.useState<T[]>([]);
    const [sortedItems, setSortedItems] = React.useState<T[]>([]);

    const { sortKey, sortDirection, handleSort, getSortDirection } =
      useTableSort({
        defaultSortKey: 'name',
        defaultSortDirection: 'asc',
      });

    React.useEffect(() => {
      setFilteredIds(
        props.items.reduce((acc, item) => {
          if (props.matchQuery(searchQuery, item)) {
            acc.push(item.id);
          }

          return acc;
        }, [] as string[]),
      );
    }, [searchQuery, props]);

    React.useEffect(() => {
      setFilteredItems(
        props.items.filter(
          (item) => !searchQuery || filteredIds.includes(item.id),
        ),
      );
    }, [filteredIds, props.items, searchQuery]);

    React.useEffect(() => {
      setSortedItems(props.sortItems(filteredItems, sortKey, sortDirection));
    }, [props, filteredItems, sortKey, sortDirection]);

    const selectItem = (itemId: string) => {
      setSelectedIds((prev) => [...prev, itemId]);
    };

    const deselectItem = (itemId: string) => {
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
    };

    const selectAll = () => {
      setSelectedIds(
        searchQuery.length ? filteredIds : props.items.map((item) => item.id),
      );
    };

    const unselectAll = () => {
      setSelectedIds([]);
    };

    const isAllSelected = selectedIds.length === props.items.length;
    const isSomeSelected = selectedIds.length > 0;

    return (
      <PMBox>
        <PMBox mb={4}>
          <PMInput
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </PMBox>
        <PMBox mb={2}>
          <PMHStack gap={2}>
            {props.batchActions}
            <PMButton
              variant="secondary"
              onClick={() => setSelectedIds([])}
              size={'sm'}
              disabled={!isSomeSelected}
            >
              Clear Selection
            </PMButton>
          </PMHStack>
        </PMBox>
        <PMTable
          columns={[
            {
              key: 'select',
              header: (
                <PMCheckbox
                  checked={isAllSelected || false}
                  onCheckedChange={() => {
                    if (isAllSelected) {
                      unselectAll();
                    } else {
                      selectAll();
                    }
                  }}
                  controlProps={{ borderColor: 'border.checkbox' }}
                />
              ),
              width: '50px',
              align: 'center',
            },
            ...props.columns.map((col) => {
              if (!col.sortKey) return col;

              return {
                ...col,
                sortable: true,
                sortDirection: getSortDirection(col.sortKey),
              };
            }),
          ]}
          data={sortedItems.map((item) => {
            return {
              key: item.id,
              select: (
                <PMCheckbox
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={(event) => {
                    const checked = event.checked === true;
                    if (checked) {
                      selectItem(item.id);
                    } else {
                      deselectItem(item.id);
                    }
                  }}
                />
              ),
              ...props.makeTableData(item),
            };
          })}
          striped={true}
          hoverable={true}
          size="md"
          variant="line"
          onSort={handleSort}
        />
      </PMBox>
    );
  };

  return <ItemsListing {...props} />;
}
