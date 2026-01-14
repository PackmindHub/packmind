import { PMPage } from '@packmind/ui';
import { PMVStack } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { SkillsList } from '../../src/domain/skills/components/SkillsList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export default function SkillsIndexRouteModule() {
  const { organization } = useAuthContext();
  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Skills"
      subtitle="Skills give the AI the ability to handle a type of task on its own — use them when a task requires structured know-how or multiple steps"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <SkillsList orgSlug={organization.slug} />
      </PMVStack>
    </PMPage>
  );
}
