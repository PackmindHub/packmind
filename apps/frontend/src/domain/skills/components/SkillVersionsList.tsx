import React from 'react';
import {
  PMCloseButton,
  PMDrawer,
  PMLink,
  PMPortal,
  PMSpinner,
  PMText,
  PMTable,
  PMTableColumn,
  PMTableRow,
} from '@packmind/ui';
import { SkillId } from '@packmind/types';
import { useGetSkillVersionsQuery } from '../api/queries/SkillsQueries';

interface ISkillVersionsListProps {
  skillId: SkillId;
  linkLabel?: string;
}

export const SkillVersionsList: React.FC<ISkillVersionsListProps> = ({
  skillId,
  linkLabel = 'See History',
}) => {
  const { data: versions, isLoading } = useGetSkillVersionsQuery(skillId);

  const tableData: PMTableRow[] = (versions ?? []).map((version) => ({
    key: version.id,
    version: version.version,
    name: version.name,
    description:
      version.description.length > 100
        ? `${version.description.substring(0, 100)}...`
        : version.description,
  }));

  const columns: PMTableColumn[] = [
    { key: 'version', header: 'Version', width: '100px', align: 'center' },
    { key: 'name', header: 'Name', grow: true },
    { key: 'description', header: 'Description', grow: true },
  ];

  const renderDrawerContent = () => {
    if (isLoading) {
      return <PMSpinner size="md" />;
    }

    if (!versions || versions.length === 0) {
      return <PMText>No versions found for this skill.</PMText>;
    }

    return (
      <PMTable
        columns={columns}
        data={tableData}
        striped={true}
        hoverable={true}
        size="md"
        variant="line"
      />
    );
  };

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
            <PMDrawer.Body>{renderDrawerContent()}</PMDrawer.Body>
            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
};
