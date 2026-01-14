import { PMPage, PMVStack } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { RecipesList } from '../../src/domain/recipes/components/RecipesList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { GettingStartedLearnMoreDialog } from '../../src/domain/organizations/components/dashboard/GettingStartedLearnMoreDialog';
import { GETTING_STARTED_CREATE_DIALOG } from '../../src/domain/organizations/components/dashboard/GettingStartedWidget';

export default function OrgCommandsIndex() {
  const { organization } = useAuthContext();
  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Commands"
      subtitle="Create and manage your commands"
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        <GettingStartedLearnMoreDialog
          body={GETTING_STARTED_CREATE_DIALOG.body}
          title={GETTING_STARTED_CREATE_DIALOG.title}
          buttonLabel="Create"
          buttonSize="md"
        />
      }
    >
      <PMVStack align="stretch" gap={6}>
        <RecipesList orgSlug={organization.slug} />
      </PMVStack>
    </PMPage>
  );
}
