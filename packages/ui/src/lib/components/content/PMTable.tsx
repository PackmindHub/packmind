import React from 'react';
import { Table } from '@chakra-ui/react';
import { PMCheckbox } from '../form/PMCheckbox';

export interface PMTableColumn {
  key: string;
  header: React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  grow?: boolean;
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
  selectAllLabel = 'Select All',
}: Readonly<IPMTableProps<T>>) {
  // getRowId is required for selection
  if (selectable && !getRowId) {
    throw new Error('getRowId prop is required when selectable is true');
  }

  // Internal state for uncontrolled mode
  const [internalSelectedRows, setInternalSelectedRows] = React.useState<
    Set<string>
  >(new Set());

  // Use controlled or uncontrolled selection
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

  // Calculate how many columns can grow
  const growingColumns = columns.filter((col) => col.grow);

  // Include selection column in calculations if selectable
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

  // If we have growing columns, distribute remaining space among them
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
        const remainingPercentage = Math.floor(100 / growingColumns.length);
        return `${remainingPercentage}%`;
      }
      return 'auto';
    } else {
      return column.width ?? 'auto';
    }
  };

  // Get all row IDs
  const rowIds: string[] = selectable && getRowId ? data.map(getRowId) : [];

  // Handle individual row selection
  const handleRowSelect = (rowId: string) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(rowId)) {
      newSelectedRows.delete(rowId);
    } else {
      newSelectedRows.add(rowId);
    }
    setSelectedRows(newSelectedRows);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === rowIds.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rowIds));
    }
  };

  // Check if all rows are selected
  const isAllSelected =
    rowIds.length > 0 &&
    selectedRows.size === rowIds.length &&
    rowIds.every((id) => selectedRows.has(id));

  return (
    <Table.Root
      size={size}
      variant={variant}
      striped={striped}
      interactive={hoverable}
      showColumnBorder={showColumnBorder}
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
            <Table.ColumnHeader textAlign="center">
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
              textAlign={getTextAlign(column.align)}
            >
              {column.header}
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
