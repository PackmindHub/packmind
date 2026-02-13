import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMPage,
  PMVStack,
  PMHStack,
  PMButton,
  PMFeatureFlag,
  DEFAULT_FEATURE_DOMAIN_MAP,
  CHANGE_PROPOSALS_FEATURE_KEY,
} from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../src/domain/spaces/hooks/useCurrentSpace';
import { RecipesList } from '../../src/domain/recipes/components/RecipesList';
import { RecipesCreateButton } from '../../src/domain/recipes/components/RecipesCreateButton';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { routes } from '../../src/shared/utils/routes';

export default function OrgCommandsIndex() {
  const navigate = useNavigate();
  const { organization, user } = useAuthContext();
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
          <PMHStack gap={2}>
            <PMFeatureFlag
              featureKeys={[CHANGE_PROPOSALS_FEATURE_KEY]}
              featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
              userEmail={user?.email}
            >
              <PMButton
                variant="tertiary"
                onClick={() =>
                  navigate(
                    routes.space.toChangeProposals(
                      organization.slug,
                      spaceSlug,
                    ),
                  )
                }
              >
                Review changes
              </PMButton>
            </PMFeatureFlag>
            <RecipesCreateButton
              orgSlug={organization.slug}
              spaceSlug={spaceSlug}
            />
          </PMHStack>
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
