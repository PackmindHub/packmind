import { useState } from 'react';
import { Link } from 'react-router';
import { PMButton, PMPage, PMVStack } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../src/domain/spaces/hooks/useCurrentSpace';
import { RecipesList } from '../../src/domain/recipes/components/RecipesList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { routes } from '../../src/shared/utils/routes';

export default function OrgCommandsIndex() {
  const { organization } = useAuthContext();
  const { spaceSlug } = useCurrentSpace();
  const [isEmpty, setIsEmpty] = useState(false);

  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Commands"
      subtitle="Commands are shortcuts you can run to trigger a specific action — use them to quickly repeat common tasks."
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        !isEmpty &&
        spaceSlug && (
          <PMButton asChild>
            <Link
              to={routes.space.toCreateCommand(organization.slug, spaceSlug)}
            >
              Create
            </Link>
          </PMButton>
        )
      }
    >
      <PMVStack align="stretch" gap={6}>
        <RecipesList
          orgSlug={organization.slug}
          onEmptyStateChange={setIsEmpty}
        />
      </PMVStack>
    </PMPage>
  );
}
