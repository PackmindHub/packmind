import { PMHStack, PMText } from '@packmind/ui';
import { Skill, SkillVersion } from '@packmind/types';

import { SkillVersionsList } from './SkillVersionsList';

interface ISkillVersionHistoryHeaderProps {
  skill: Skill;
  latestVersion: SkillVersion;
}

export const SkillVersionHistoryHeader = ({
  skill,
  latestVersion,
}: ISkillVersionHistoryHeaderProps) => {
  return (
    <PMHStack gap={8} alignItems="center" height="full">
      <PMHStack gap={1} alignItems="center" height="full">
        <PMText variant="small" color="secondary">
          Version:
        </PMText>
        <PMText variant="small">{latestVersion.version}</PMText>
        <SkillVersionsList skillId={skill.id} linkLabel="History" />
      </PMHStack>
    </PMHStack>
  );
};
