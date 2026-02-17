import { useParams } from 'react-router';
import { PMPage, PMBox, PMSpinner, PMText, PMVStack } from '@packmind/ui';
import { EditCommand } from '../../src/domain/recipes/components/EditCommand';
import { useGetRecipeByIdQuery } from '../../src/domain/recipes/api/queries/RecipesQueries';
import { RecipeId } from '@packmind/types';
import { RecipeVersionHistoryHeader } from '../../src/domain/recipes/components/RecipeVersionHistoryHeader';

export default function EditCommandRouteModule() {
  const { commandId } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    commandId: string;
  }>();

  const {
    data: recipe,
    isLoading,
    isError,
  } = useGetRecipeByIdQuery(commandId as RecipeId);

  if (isLoading) {
    return (
      <PMPage
        title="Loading Command..."
        subtitle="Please wait while we fetch the command details"
      >
        <PMBox
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="200px"
        >
          <PMSpinner size="lg" mr={2} />
          <PMText ml={2}>Loading command details...</PMText>
        </PMBox>
      </PMPage>
    );
  }

  if (isError || !recipe) {
    return (
      <PMPage title="Error" subtitle="Failed to load command">
        <PMBox display="flex" justifyContent="center" py={8}>
          <PMVStack gap={4}>
            <span>Failed to load command. Please try again.</span>
          </PMVStack>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <PMPage
      breadcrumbComponent={<RecipeVersionHistoryHeader recipe={recipe} />}
    >
      <EditCommand recipe={recipe} />
    </PMPage>
  );
}
