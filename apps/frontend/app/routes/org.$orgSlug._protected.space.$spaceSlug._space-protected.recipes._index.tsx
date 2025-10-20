import { PMPage } from '@packmind/ui';
import { PMVStack } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { RecipesList } from '../../src/domain/recipes/components/RecipesList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export default function OrgRecipesIndex() {
  const { organization } = useAuthContext();
  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Recipes"
      subtitle="Create and manage your recipes"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <RecipesList orgSlug={organization.slug} />
      </PMVStack>
    </PMPage>
  );
}
