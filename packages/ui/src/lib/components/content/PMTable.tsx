import React from 'react';
import { Box, Table } from '@chakra-ui/react';
import { LuArrowUp, LuArrowDown, LuArrowUpDown } from 'react-icons/lu';
import { PMCheckbox } from '../form/PMCheckbox';

export interface PMTableColumn {
  key: string;
  header: React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  grow?: boolean;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
}

export interface PMTableRow {
  [key: string]: React.ReactNode;
}

export interface IPMTableProps<T extends object = object> {
  columns: PMTableColumn[];
  data: T[];
  striped?: boolean;
  hoverable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'line' | 'outline';
  showColumnBorder?: boolean;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedRows: Set<string>) => void;
  getRowId?: (row: T, index: number) => string;
  selectAllLabel?: string;
  onSort?: (columnKey: string) => void;
  /**
   * Pin the header row to the top of whatever scrolls the table, so the column
   * names stay readable past the first screenful. Off by default: a table short
   * enough to read whole gains nothing, and a table inside a container that
   * does not scroll would pin its header to a viewport it does not belong to.
   */
  stickyHeader?: boolean;
  tableProps?: React.ComponentPropsWithoutRef<typeof Table.Root>;
}

export function PMTable<T extends object = object>({
  columns,
  data,
  striped = true,
  hoverable = true,
  size = 'md',
  variant = 'line',
  showColumnBorder = false,
  selectable = false,
  selectedRows: controlledSelectedRows,
  onSelectionChange,
  getRowId,
  onSort,
  selectAllLabel = 'Select All',
  stickyHeader = false,
  tableProps,
}: Readonly<IPMTableProps<T>>) {
  if (selectable && !getRowId) {
    throw new Error('getRowId prop is required when selectable is true');
  }

  const [internalSelectedRows, setInternalSelectedRows] = React.useState<
    Set<string>
  >(new Set());

  const selectedRows = controlledSelectedRows ?? internalSelectedRows;
  const setSelectedRows = onSelectionChange ?? setInternalSelectedRows;

  const getTextAlign = (align?: string) => {
    switch (align) {
      case 'center':
        return 'center';
      case 'right':
        return 'end';
      default:
        return 'start';
    }
  };

  const growingColumns = columns.filter((col) => col.grow);
  const fixedColumns = columns.filter((col) => !col.grow);
  function parseWidth(width?: string): number {
    if (!width) return 0;
    if (width.endsWith('%')) return parseFloat(width);
    if (width.endsWith('px')) return (parseFloat(width) * 100) / 1200; // approx px to %
    return 0;
  }
  const totalFixedPercent = fixedColumns.reduce(
    (sum, col) => sum + parseWidth(col.width),
    0,
  );

  const allColumns = selectable
    ? [
        {
          key: '__selection__',
          header: '',
          width: '50px',
          align: 'center' as const,
        },
        ...columns,
      ]
    : columns;

  const getEffectiveColumnWidth = (
    column:
      | PMTableColumn
      | {
          key: string;
          header: string;
          width?: string;
          align?: 'left' | 'center' | 'right';
        },
    index: number,
  ) => {
    if ('grow' in column && column.grow) {
      if (column.width) {
        return column.width;
      } else if (growingColumns.length > 0) {
        const remaining = Math.max(0, 100 - totalFixedPercent);
        const percent = remaining / growingColumns.length;
        return `${percent}%`;
      }
      return 'auto';
    } else {
      return column.width ?? 'auto';
    }
  };

  const rowIds: string[] = selectable && getRowId ? data.map(getRowId) : [];

  const handleRowSelect = (rowId: string) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(rowId)) {
      newSelectedRows.delete(rowId);
    } else {
      newSelectedRows.add(rowId);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === rowIds.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rowIds));
    }
  };

  const isAllSelected =
    rowIds.length > 0 &&
    selectedRows.size === rowIds.length &&
    rowIds.every((id) => selectedRows.has(id));

  /**
   * Screen-reader announcement of the column's sort state, on the `th` where
   * the spec expects it. Without it the arrow icon is the only signal, and it
   * is a picture.
   */
  const getAriaSort = (
    sortDirection?: 'asc' | 'desc' | null,
  ): 'ascending' | 'descending' | 'none' => {
    if (sortDirection === 'asc') return 'ascending';
    if (sortDirection === 'desc') return 'descending';
    return 'none';
  };

  const getSortIcon = (sortDirection?: 'asc' | 'desc' | null) => {
    switch (sortDirection) {
      case 'asc':
        return <LuArrowUp aria-label="sorted ascending" />;
      case 'desc':
        return <LuArrowDown aria-label="sorted descending" />;
      default:
        return <LuArrowUpDown aria-label="sortable" />;
    }
  };

  /*
   * The header cells carry the pinning rather than the row: `position: sticky`
   * on a `<tr>` is ignored in Safari, and the recipe already gives every header
   * cell an opaque background for the rows to pass under.
   */
  const stickyHeaderProps = stickyHeader
    ? ({ position: 'sticky', top: 0, zIndex: 1 } as const)
    : {};

  return (
    <Table.Root
      size={size}
      variant={variant}
      striped={striped}
      interactive={hoverable}
      showColumnBorder={showColumnBorder}
      {...tableProps}
    >
      <Table.ColumnGroup>
        {allColumns.map((column, index) => (
          <Table.Column
            key={column.key}
            htmlWidth={getEffectiveColumnWidth(column, index)}
          />
        ))}
      </Table.ColumnGroup>
      <Table.Header>
        <Table.Row>
          {selectable && (
            <Table.ColumnHeader textAlign="center" {...stickyHeaderProps}>
              <PMCheckbox
                checked={isAllSelected}
                onChange={handleSelectAll}
                aria-label={selectAllLabel}
                data-testid={'pmtable.selectAll'}
              />
            </Table.ColumnHeader>
          )}
          {columns.map((column) => (
            <Table.ColumnHeader
              key={column.key}
              {...stickyHeaderProps}
              textAlign={getTextAlign(column.align)}
              aria-sort={
                column.sortable ? getAriaSort(column.sortDirection) : undefined
              }
            >
              {/*
               * The control is a real button inside the header cell rather than
               * a click handler on the `th`: a `th` is not focusable and does
               * not respond to Enter or Space, so sorting was mouse-only. The
               * button stretches to the cell so the hit area is unchanged.
               */}
              {column.sortable ? (
                <Box
                  as="button"
                  onClick={() => onSort?.(column.key)}
                  display="inline-flex"
                  alignItems="center"
                  gap="4px"
                  whiteSpace="nowrap"
                  width="100%"
                  justifyContent={getTextAlign(column.align)}
                  background="none"
                  border="none"
                  padding={0}
                  font="inherit"
                  color="inherit"
                  cursor="pointer"
                  userSelect="none"
                  borderRadius="sm"
                  _focusVisible={{
                    outline: '2px solid',
                    outlineColor: 'branding.primary',
                    outlineOffset: '2px',
                  }}
                >
                  {column.header}
                  {getSortIcon(column.sortDirection)}
                </Box>
              ) : (
                column.header
              )}
            </Table.ColumnHeader>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {data.map((row, index) => {
          const rowId = getRowId ? getRowId(row, index) : String(index);
          return (
            <Table.Row key={rowId}>
              {selectable && (
                <Table.Cell textAlign="center">
                  <PMCheckbox
                    checked={selectedRows.has(rowId)}
                    onChange={() => handleRowSelect(rowId)}
                    aria-label={`Select row ${rowId}`}
                  />
                </Table.Cell>
              )}
              {columns.map((column) => (
                <Table.Cell
                  key={column.key}
                  textAlign={getTextAlign(column.align)}
                >
                  {
                    (row as Record<string, unknown>)[
                      column.key
                    ] as React.ReactNode
                  }
                </Table.Cell>
              ))}
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
}
