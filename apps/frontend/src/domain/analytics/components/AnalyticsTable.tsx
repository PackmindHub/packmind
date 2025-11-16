import React from 'react';
import { PMTable, PMTableColumn, PMTableRow, PMEmptyState } from '@packmind/ui';

const COLUMNS: PMTableColumn[] = [
  { key: 'recipeName', header: 'Recipe', width: '40%' },
  {
    key: 'totalUsageCount',
    header: 'Usage Count',
    width: '20%',
    align: 'center',
  },
  { key: 'lastUsedAt', header: 'Last Used', width: '40%', align: 'center' },
];

type AnalyticsTableProps = {
  data: PMTableRow[];
};

export const AnalyticsTable: React.FC<AnalyticsTableProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <PMEmptyState
        title="No Recipe Usage Data"
        description="Recipe usage will appear here when AI agents like Cursor, Claude Code, or GitHub Copilot use your Packmind recipes through the MCP server."
      />
    );
  }

  return (
    <PMTable
      columns={COLUMNS}
      data={data}
      striped={true}
      hoverable={true}
      size="md"
      variant="line"
    />
  );
};
