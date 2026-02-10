import { PMPage, PMVStack, PMHStack } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { SkillsList } from '../../src/domain/skills/components/SkillsList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { DownloadDefaultSkillsPopover } from '../../src/domain/skills/components/DownloadDefaultSkillsPopover';
import { useGetSkillsQuery } from '../../src/domain/skills/api/queries/SkillsQueries';
import { useParams } from 'react-router';
import { SkillsCreateButton } from '../../src/domain/skills/components/SkillsCreateButton';

export default function SkillsIndexRouteModule() {
  const { organization } = useAuthContext();
  const { spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { data: skills } = useGetSkillsQuery();

  const hasSkills = skills && skills.length > 0;

  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Skills"
      subtitle="Skills give the AI the ability to handle a type of task on its own — use them when a task requires structured know-how or multiple steps"
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        <PMHStack gap={2}>
          {hasSkills && <DownloadDefaultSkillsPopover />}
          {hasSkills && spaceSlug && (
            <SkillsCreateButton spaceSlug={spaceSlug} />
          )}
        </PMHStack>
      }
    >
      <PMVStack align="stretch" gap={6}>
        <SkillsList orgSlug={organization.slug} />
      </PMVStack>
    </PMPage>
  );
}
