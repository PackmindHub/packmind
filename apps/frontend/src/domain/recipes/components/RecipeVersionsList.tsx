import React, { useCallback } from 'react';
import { useGetRecipeVersionsQuery } from '../api/queries/RecipesQueries';
import { RecipeId, RecipeVersion } from '@packmind/types';
import { PMBox } from '@packmind/ui';
import { PMSpinner } from '@packmind/ui';
import {
  PMHeading,
  PMText,
  PMTable,
  PMTableColumn,
  PMTableRow,
} from '@packmind/ui';
import { DeployRecipeButton } from './DeployRecipeButton';

interface RecipeVersionsListProps {
  recipeId: RecipeId;
}

export const RecipeVersionsList: React.FC<RecipeVersionsListProps> = ({
  recipeId,
}) => {
  const {
    data: versions,
    isLoading,
    isError,
    error,
  } = useGetRecipeVersionsQuery(recipeId);

  // Compute versionRows in render phase to avoid Rules of Hooks violations
  const versionRows: PMTableRow[] = versions
    ? versions.map((version: RecipeVersion) => ({
        version: version.version,
        name: version.name,
        slug: version.slug,
        source: version.gitCommit ? (
          <a
            href={version.gitCommit.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#3182ce', textDecoration: 'underline' }}
          >
            {version.gitCommit.sha.substring(0, 7)}
          </a>
        ) : (
          'N/A'
        ),
        actions: (
          <></>
          // <DeployRecipeButton
          //   label={`Deploy v${version.version}`}
          //   size="sm"
          //   selectedRecipes={[version.re]}
          // />
        ),
      }))
    : [];

  // Define columns for the table
  const columns: PMTableColumn[] = [
    { key: 'version', header: 'Version', width: '10%', align: 'center' },
    { key: 'name', header: 'Name', width: '20%', grow: true },
    { key: 'slug', header: 'Slug', width: '15%' },
    { key: 'source', header: 'Source', width: '20%' },
    { key: 'actions', header: 'Actions', width: '150px', align: 'center' },
  ];

  if (isLoading) {
    return (
      <PMBox p={4} borderRadius="md" shadow="sm">
        <PMHeading level="h2">Loading Recipe Versions...</PMHeading>
        <PMText as="p" variant="body">
          Please wait while we fetch the recipe versions.
        </PMText>
        <PMBox display="flex" justifyContent="center" mt={4}>
          <PMSpinner size="xl" color="blue.500" />
        </PMBox>
      </PMBox>
    );
  }

  if (isError) {
    return (
      <PMBox
        p={4}
        borderRadius="md"
        shadow="sm"
        borderLeft="4px solid"
        borderLeftColor="red.500"
      >
        <PMHeading level="h2">Error Loading Recipe Versions</PMHeading>
        <PMText as="p" variant="body">
          Sorry, we couldn't load the recipe versions.
        </PMText>
        {error && (
          <PMText as="p" variant="small" color="error">
            Error: {error.message}
          </PMText>
        )}
      </PMBox>
    );
  }

  if (versionRows.length === 0) {
    return (
      <PMBox
        p={4}
        borderRadius="md"
        shadow="sm"
        borderLeft="4px solid"
        borderLeftColor="yellow.500"
      >
        <PMHeading level="h2">No Versions Found</PMHeading>
        <PMText as="p" variant="body">
          There are no versions available for this recipe.
        </PMText>
      </PMBox>
    );
  }

  return (
    <PMBox className="recipe-versions" p={4} borderRadius="md" shadow="md">
      <PMHeading level="h2">Recipe Versions</PMHeading>
      <PMTable
        columns={columns}
        data={versionRows}
        striped={true}
        hoverable={true}
        size="md"
        variant="line"
        showColumnBorder={false}
      />
    </PMBox>
  );
};
