import { ChangeEvent, useMemo } from 'react';
import {
  PMBox,
  PMNativeSelect,
  PMText,
  PMVerticalNav,
  PMVStack,
} from '@packmind/ui';

import type { Skill, SkillFile } from '@packmind/types';

import { SkillFileTree } from './SkillFileTree';

interface ISkillDetailsSidebarProps {
  skill: Skill;
  skills: Skill[];
  files: SkillFile[];
  selectedFilePath: string | null;
  onFileSelect: (path: string) => void;
  onSkillChange: (skillId: string) => void;
  isSkillSelectDisabled: boolean;
  skillsLoading: boolean;
}

export const SkillDetailsSidebar = ({
  skill,
  skills,
  files,
  selectedFilePath,
  onFileSelect,
  onSkillChange,
  isSkillSelectDisabled,
  skillsLoading,
}: ISkillDetailsSidebarProps) => {
  const skillSelectItems = useMemo(
    () =>
      (skills.length > 0 ? skills : [skill]).map((s) => ({
        label: s.name,
        value: s.id,
      })),
    [skills, skill],
  );

  const handleSkillChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSkillId = event.target.value;
    if (!nextSkillId || nextSkillId === skill.id) {
      return;
    }
    onSkillChange(nextSkillId);
  };

  const selectDisabled =
    isSkillSelectDisabled || skillsLoading || skillSelectItems.length === 0;

  return (
    <PMVerticalNav
      logo={false}
      showLogoContainer={false}
      width="270px"
      headerNav={
        <PMBox width="full" padding={3}>
          <PMNativeSelect
            aria-label="Select skill"
            value={skill.id}
            onChange={handleSkillChange}
            items={skillSelectItems}
            width="full"
            border="solid 1px"
            borderColor="border.secondary"
            backgroundColor="background.primary"
            disabled={selectDisabled}
          />
        </PMBox>
      }
    >
      <PMVStack align="flex-start" px={2} gap={2}>
        <PMText fontSize="xs" fontWeight="bold" color="secondary">
          FILES
        </PMText>
        {files.length === 0 ? (
          <PMText color="faded" fontSize="sm">
            No files found.
          </PMText>
        ) : (
          <SkillFileTree
            files={files}
            selectedFilePath={selectedFilePath}
            onFileSelect={onFileSelect}
          />
        )}
      </PMVStack>
    </PMVerticalNav>
  );
};
