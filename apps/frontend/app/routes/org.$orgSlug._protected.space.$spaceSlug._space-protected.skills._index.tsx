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
      subtitle="Browse and manage your skills"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <SkillsList orgSlug={organization.slug} />
      </PMVStack>
    </PMPage>
  );
}
