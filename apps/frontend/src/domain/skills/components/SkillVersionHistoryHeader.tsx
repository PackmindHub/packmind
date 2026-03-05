import { PMHStack, PMText } from '@packmind/ui';
import { Skill, SkillVersion } from '@packmind/types';
import { useParams } from 'react-router';

import { SkillVersionsList } from './SkillVersionsList';
import { PackageCountHeaderInfo } from '../../deployments/components/PackageCountBadge';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

interface ISkillVersionHistoryHeaderProps {
  skill: Skill;
  latestVersion: SkillVersion;
}

export const SkillVersionHistoryHeader = ({
  skill,
  latestVersion,
}: ISkillVersionHistoryHeaderProps) => {
  const { spaceSlug, spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();
  const { orgSlug } = useParams<{ orgSlug: string }>();

  return (
    <PMHStack gap={8} alignItems="center" height="full">
      <PMHStack gap={1} alignItems="center" height="full">
        <PMText variant="small" color="secondary">
          Version:
        </PMText>
        <PMText variant="small">{latestVersion.version}</PMText>
        <SkillVersionsList skillId={skill.id} linkLabel="History" />
      </PMHStack>
      <PackageCountHeaderInfo
        artifactId={skill.id}
        artifactType="skill"
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
        spaceId={spaceId}
        organizationId={organization?.id}
      />
    </PMHStack>
  );
};
