import { PMPage, PMVStack, PMHStack } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { SkillsList } from '../../src/domain/skills/components/SkillsList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { GettingStartedLearnMoreDialog } from '../../src/domain/organizations/components/dashboard/GettingStartedLearnMoreDialog';
import { SkillsLearnMoreContent } from '../../src/domain/skills/components/SkillsLearnMoreContent';
import { DownloadDefaultSkillsPopover } from '../../src/domain/skills/components/DownloadDefaultSkillsPopover';
import { useGetSkillsQuery } from '../../src/domain/skills/api/queries/SkillsQueries';
import { useParams } from 'react-router';

export default function SkillsIndexRouteModule() {
  const { organization, user } = useAuthContext();
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
          {spaceSlug && (
            <GettingStartedLearnMoreDialog
              body={<SkillsLearnMoreContent />}
              title="How to create skills"
              buttonLabel="Create"
              buttonSize="md"
            />
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
