import { useParams, NavLink } from 'react-router';
import { PMPage, PMVStack, PMBox, PMSpinner, PMText } from '@packmind/ui';
import { EditCommand } from '../../src/domain/recipes/components/EditCommand';
import { useGetRecipeByIdQuery } from '../../src/domain/recipes/api/queries/RecipesQueries';
import { RecipeId } from '@packmind/types';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({
    params,
  }: {
    params: { orgSlug: string; spaceSlug: string; commandId: string };
  }) => {
    return (
      <NavLink
        to={routes.space.toEditCommand(
          params.orgSlug,
          params.spaceSlug,
          params.commandId,
        )}
      >
        Edit
      </NavLink>
    );
  },
};

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
        breadcrumbComponent={<AutobreadCrumb />}
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
      <PMPage
        title="Error"
        subtitle="Failed to load command"
        breadcrumbComponent={<AutobreadCrumb />}
      >
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
      title={`Edit ${recipe.name}`}
      subtitle="Update command details"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <EditCommand recipe={recipe} />
      </PMVStack>
    </PMPage>
  );
}
