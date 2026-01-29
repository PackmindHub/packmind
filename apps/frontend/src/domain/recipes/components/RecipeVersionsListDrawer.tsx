import React from 'react';
import {
  PMText,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMCloseButton,
  PMDrawer,
  PMLink,
  PMPortal,
} from '@packmind/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import { useGetRecipeVersionsQuery } from '../api/queries/RecipesQueries';
import { RecipeId, WithTimestamps } from '@packmind/types';

interface RecipeVersionsListDrawerProps {
  recipeId: RecipeId;
}

export const RecipeVersionsListDrawer: React.FC<
  RecipeVersionsListDrawerProps
> = ({ recipeId }) => {
  const { data: versions, isLoading } = useGetRecipeVersionsQuery(recipeId);

  if (isLoading) {
    return <PMText>Loading versions...</PMText>;
  }

  if (!versions || versions.length === 0) {
    return <PMText>No versions found for this command.</PMText>;
  }

  const tableData: PMTableRow[] = versions.map((version) => ({
    key: version.id,
    version: version.version,
    name: version.name,
    description:
      version.content && version.content.length > 100
        ? `${version.content.substring(0, 100)}...`
        : version.content || '-',
    createdAt: formatDistanceToNowStrict(
      (version as WithTimestamps<typeof version>).createdAt,
      { addSuffix: true },
    ),
  }));

  const columns: PMTableColumn[] = [
    { key: 'version', header: 'Version', width: '100px', align: 'center' },
    { key: 'name', header: 'Name', grow: true },
    { key: 'description', header: 'Description', grow: true },
    { key: 'createdAt', header: 'Created', align: 'center', grow: true },
  ];

  return (
    <PMDrawer.Root size="xl">
      <PMDrawer.Trigger asChild>
        <PMLink fontSize={'xs'} variant="underline">
          See History
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
