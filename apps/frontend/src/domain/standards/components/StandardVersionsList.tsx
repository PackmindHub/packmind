import React from 'react';
import {
  PMCloseButton,
  PMDrawer,
  PMLink,
  PMPortal,
  PMText,
  PMTable,
  PMTableColumn,
  PMTableRow,
} from '@packmind/ui';
import { StandardId, StandardVersion } from '@packmind/shared';

interface StandardVersionsListProps {
  standardId: StandardId;
  versions?: StandardVersion[];
  isLoading: boolean;
  orgSlug?: string;
  linkLabel?: string;
}

export const StandardVersionsList: React.FC<StandardVersionsListProps> = ({
  versions,
  isLoading,
  linkLabel = 'See History',
}) => {
  if (isLoading) {
    return <PMText>Loading versions...</PMText>;
  }

  if (!versions || versions.length === 0) {
    return <PMText>No versions found for this standard.</PMText>;
  }

  const tableData: PMTableRow[] = versions.map((version) => ({
    key: version.id,
    version: version.version,
    name: version.name,
    description:
      version.description.length > 100
        ? `${version.description.substring(0, 100)}...`
        : version.description,
    scope: version.scope || '-',
    rules: version.rules?.length || 0,
  }));

  const columns: PMTableColumn[] = [
    { key: 'version', header: 'Version', width: '100px', align: 'center' },
    { key: 'name', header: 'Name', grow: true },
    { key: 'description', header: 'Description', grow: true },
    { key: 'scope', header: 'Scope', width: '120px', align: 'center' },
    { key: 'rules', header: 'Rules', width: '80px', align: 'center' },
  ];

  return (
    <PMDrawer.Root size="xl">
      <PMDrawer.Trigger asChild>
        <PMLink fontSize={'xs'} variant="underline">
          {linkLabel}
        </PMLink>
      </PMDrawer.Trigger>
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMDrawer.Title>History</PMDrawer.Title>
            </PMDrawer.Header>
            <PMDrawer.Body>
              <PMTable
                columns={columns}
                data={tableData}
                striped={true}
                hoverable={true}
                size="md"
                variant="line"
              />
            </PMDrawer.Body>
            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
};
