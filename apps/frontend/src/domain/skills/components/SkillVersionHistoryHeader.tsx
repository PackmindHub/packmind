import { PMHStack, PMText } from '@packmind/ui';
import { Skill, SkillVersion } from '@packmind/types';

import { SkillVersionsList } from './SkillVersionsList';
import { PackagesPopover } from '../../deployments/components/PackagesPopover';
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
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return (
    <PMHStack gap={8} alignItems="center" height="full">
      <PMHStack gap={1} alignItems="center" height="full">
        <PMText variant="small" color="secondary">
          Version:
        </PMText>
        <PMText variant="small">{latestVersion.version}</PMText>
        <SkillVersionsList skillId={skill.id} linkLabel="History" />
      </PMHStack>
      <PackagesPopover
        artifactId={skill.id}
        artifactType="skill"
        artifactKindLabel="skill"
        artifactName={skill.name}
        spaceId={spaceId}
        organizationId={organization?.id}
      />
    </PMHStack>
  );
};
