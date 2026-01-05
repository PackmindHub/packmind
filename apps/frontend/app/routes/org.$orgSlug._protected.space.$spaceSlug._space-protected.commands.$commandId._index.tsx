import { useParams } from 'react-router';
import { PMPage, PMBox } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { RecipeDetails } from '../../src/domain/recipes/components/RecipeDetails';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { RecipeId } from '@packmind/types';

export default function CommandDetailsIndexRouteModule() {
  const { commandId } = useParams<{
    orgSlug: string;
    commandId: string;
  }>();
  const { organization } = useAuthContext();

  if (!organization) {
    return null;
  }

  if (!commandId) {
    return (
      <PMPage
        title="Command Not Found"
        subtitle="No command ID provided"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <p>
            The command you're looking for doesn't exist or the ID is invalid.
          </p>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <RecipeDetails
      id={commandId as RecipeId}
      orgSlug={organization.slug}
      orgName={organization.name}
    />
  );
}
