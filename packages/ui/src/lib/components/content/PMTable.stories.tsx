import type { Meta, StoryObj } from '@storybook/react';
import { PMTable } from './PMTable';
import React from 'react';

const meta: Meta<typeof PMTable> = {
  title: 'Content/PMTable',
  component: PMTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PMTable>;

const sampleColumns = [
  { key: 'name', header: 'Name', width: '200px', align: 'left' as const },
  { key: 'email', header: 'Email', width: '250px', align: 'left' as const },
  { key: 'role', header: 'Role', width: '150px', align: 'center' as const },
  { key: 'status', header: 'Status', width: '100px', align: 'center' as const },
  {
    key: 'actions',
    header: 'Actions',
    width: '120px',
    align: 'right' as const,
  },
];

// New column configurations for demonstrating grow functionality
const growingColumns = [
  {
    key: 'id',
    header: 'ID',
    width: '60px',
    align: 'center' as const,
    grow: false,
  },
  {
    key: 'name',
    header: 'Name',
    width: '150px',
    align: 'left' as const,
    grow: false,
  },
  {
    key: 'description',
    header: 'Description',
    align: 'left' as const,
    grow: true,
  },
  { key: 'category', header: 'Category', align: 'center' as const, grow: true },
  {
    key: 'actions',
    header: 'Actions',
    width: '100px',
    align: 'right' as const,
    grow: false,
  },
];

const mixedColumns = [
  {
    key: 'avatar',
    header: '',
    width: '50px',
    align: 'center' as const,
    grow: false,
  },
  {
    key: 'name',
    header: 'Name',
    width: '120px',
    align: 'left' as const,
    grow: false,
  },
  { key: 'email', header: 'Email Address', align: 'left' as const, grow: true },
  {
    key: 'role',
    header: 'Role',
    width: '100px',
    align: 'center' as const,
    grow: false,
  },
  {
    key: 'lastActivity',
    header: 'Last Activity',
    align: 'left' as const,
    grow: true,
  },
  {
    key: 'status',
    header: 'Status',
    width: '80px',
    align: 'center' as const,
    grow: false,
  },
];

type SampleRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  actions: string;
};

const sampleData: SampleRow[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin',
    status: 'Active',
    actions: 'Edit | Delete',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'User',
    status: 'Active',
    actions: 'Edit | Delete',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'Editor',
    status: 'Inactive',
    actions: 'Edit | Delete',
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    role: 'User',
    status: 'Active',
    actions: 'Edit | Delete',
  },
];

// Sample data for growing columns demo
const growingData = [
  {
    id: '1',
    name: 'Project Alpha',
    description:
      'A comprehensive project management system with advanced features for team collaboration and resource planning.',
    category: 'Software Development',
    actions: 'Edit',
  },
  {
    id: '2',
    name: 'Beta Release',
    description:
      'Mobile application for customer engagement with real-time notifications and analytics dashboard.',
    category: 'Mobile Apps',
    actions: 'Edit',
  },
  {
    id: '3',
    name: 'Data Pipeline',
    description:
      'ETL pipeline for processing large datasets from multiple sources with automated reporting capabilities.',
    category: 'Data Engineering',
    actions: 'Edit',
  },
];

// Sample data for mixed columns demo
const mixedData = [
  {
    avatar: '👤',
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'Admin',
    lastActivity: 'Last seen 2 hours ago working on project documentation',
    status: 'Online',
  },
  {
    avatar: '👩',
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    role: 'User',
    lastActivity:
      'Last seen yesterday reviewing code changes and submitting pull requests',
    status: 'Away',
  },
  {
    avatar: '👨',
    name: 'Bob Johnson',
    email: 'bob.johnson@company.com',
    role: 'Editor',
    lastActivity:
      'Last seen 3 days ago updating team documentation and guidelines',
    status: 'Offline',
  },
];

export const Default: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
  },
};

export const WithoutStripes: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    striped: false,
  },
};

export const WithoutHover: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    hoverable: false,
  },
};

export const SmallSize: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    size: 'sm',
  },
};

export const LargeSize: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    size: 'lg',
  },
};

export const OutlineVariant: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    variant: 'outline',
  },
};

export const WithColumnBorders: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    showColumnBorder: true,
  },
};

export const EmptyTable: Story = {
  args: {
    columns: sampleColumns,
    data: [],
  },
};

// New stories demonstrating grow functionality
export const GrowingColumns: Story = {
  args: {
    columns: growingColumns,
    data: growingData,
  },
  parameters: {
    docs: {
      description: {
        story:
          'This example shows how columns can grow to fill available space. The "Description" and "Category" columns have `grow: true` and will expand to fill the remaining space, while ID, Name, and Actions columns maintain their fixed widths.',
      },
    },
  },
};

export const MixedColumnWidths: Story = {
  args: {
    columns: mixedColumns,
    data: mixedData,
  },
  parameters: {
    docs: {
      description: {
        story:
          'This example demonstrates a mixed approach where some columns are fixed (Avatar, Name, Role, Status) and others grow (Email, Last Activity) to accommodate longer content.',
      },
    },
  },
};

export const AllGrowingColumns: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name', align: 'left' as const, grow: true },
      { key: 'email', header: 'Email', align: 'left' as const, grow: true },
      { key: 'role', header: 'Role', align: 'center' as const, grow: true },
      { key: 'status', header: 'Status', align: 'center' as const, grow: true },
    ],
    data: sampleData,
  },
  parameters: {
    docs: {
      description: {
        story:
          'All columns are set to grow, so they will distribute the available space evenly among themselves.',
      },
    },
  },
};

export const AllFixedColumns: Story = {
  args: {
    columns: [
      {
        key: 'name',
        header: 'Name',
        width: '200px',
        align: 'left' as const,
        grow: false,
      },
      {
        key: 'email',
        header: 'Email',
        width: '250px',
        align: 'left' as const,
        grow: false,
      },
      {
        key: 'role',
        header: 'Role',
        width: '150px',
        align: 'center' as const,
        grow: false,
      },
      {
        key: 'status',
        header: 'Status',
        width: '100px',
        align: 'center' as const,
        grow: false,
      },
    ],
    data: sampleData,
  },
  parameters: {
    docs: {
      description: {
        story:
          'All columns have fixed widths and will not grow beyond their specified dimensions.',
      },
    },
  },
};

// Selection stories
export const WithSelection: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    selectable: true,
    getRowId: (row) => row.id,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Table with selection enabled. Users can select individual rows or use the select all checkbox in the header. The getRowId prop is required for selection and should return a unique string ID for each row.',
      },
    },
  },
};

export const WithPreselectedRows: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    selectable: true,
    getRowId: (row) => row.id,
    selectedRows: new Set(['1', '3']),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Table with some rows pre-selected. The select all checkbox will show an indeterminate state. The getRowId prop is required for selection.',
      },
    },
  },
};

export const WithAllRowsSelected: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    selectable: true,
    getRowId: (row) => row.id,
    selectedRows: new Set(['1', '2', '3', '4']),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Table with all rows selected. The select all checkbox will be fully checked. The getRowId prop is required for selection.',
      },
    },
  },
};

export const SelectionWithCustomLabel: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    selectable: true,
    getRowId: (row) => row.id,
    selectAllLabel: 'Select All Users',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Table with selection enabled and a custom label for the select all checkbox (visible in accessibility tools). The getRowId prop is required for selection.',
      },
    },
  },
};

export const EmptyTableWithSelection: Story = {
  args: {
    columns: sampleColumns,
    data: [],
    selectable: true,
    getRowId: (row) => row.id,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Empty table with selection enabled. The select all checkbox is present but disabled. The getRowId prop is required for selection.',
      },
    },
  },
};

// Interactive selection example
export const InteractiveSelectionExample: Story = {
  render: () => {
    // Example usage component showing how to implement selection
    const ExampleUsageComponent = () => {
      const [selectedRows, setSelectedRows] = React.useState<Set<string>>(
        new Set(),
      );
      const [actionMessage, setActionMessage] = React.useState<string>('');

      const handleSelectionChange = (newSelectedRows: Set<string>) => {
        setSelectedRows(newSelectedRows);
        setActionMessage(`Selected ${newSelectedRows.size} row(s)`);
      };

      const handleBulkAction = (action: string) => {
        if (selectedRows.size === 0) {
          setActionMessage('No rows selected');
          return;
        }

        const selectedUsers = Array.from(selectedRows).map((id) => {
          const row = sampleData.find((row) => row.id === id);
          return row ? row.name : id;
        });
        setActionMessage(
          `${action} action performed on: ${selectedUsers.join(', ')}`,
        );
      };

      const handleClearSelection = () => {
        setSelectedRows(new Set());
        setActionMessage('Selection cleared');
      };

      return (
        <div style={{ padding: '16px' }}>
          <div
            style={{
              marginBottom: '16px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => handleBulkAction('Delete')}
              disabled={selectedRows.size === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedRows.size > 0 ? '#dc3545' : '#e9ecef',
                color: selectedRows.size > 0 ? 'white' : '#6c757d',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRows.size > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Delete Selected ({selectedRows.size})
            </button>
            <button
              onClick={() => handleBulkAction('Export')}
              disabled={selectedRows.size === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedRows.size > 0 ? '#28a745' : '#e9ecef',
                color: selectedRows.size > 0 ? 'white' : '#6c757d',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRows.size > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Export Selected
            </button>
            <button
              onClick={handleClearSelection}
              disabled={selectedRows.size === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedRows.size > 0 ? '#6c757d' : '#e9ecef',
                color: selectedRows.size > 0 ? 'white' : '#6c757d',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRows.size > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Clear Selection
            </button>
          </div>

          {actionMessage && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#e7f3ff',
                border: '1px solid #b3d9ff',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#0056b3',
              }}
            >
              {actionMessage}
            </div>
          )}

          <PMTable<SampleRow>
            columns={sampleColumns}
            data={sampleData}
            selectable={true}
            getRowId={(row) => row.id}
            selectedRows={selectedRows}
            onSelectionChange={
              handleSelectionChange as (
                selectedRows: Set<string | number>,
              ) => void
            }
            selectAllLabel="Select All Users"
          />
        </div>
      );
    };

    return <ExampleUsageComponent />;
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive example showing how to implement selection in a real application. This demonstrates controlled selection state, bulk actions, and user feedback. The getRowId prop is required for selection.',
      },
    },
  },
};
