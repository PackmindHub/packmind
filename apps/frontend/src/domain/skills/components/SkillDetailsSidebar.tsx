import { ChangeEvent, useMemo } from 'react';
import {
  PMBox,
  PMNativeSelect,
  PMVerticalNav,
  PMVerticalNavSection,
  PMVStack,
} from '@packmind/ui';
import { LuGitCommitVertical } from 'react-icons/lu';

import type { Skill, SkillFile } from '@packmind/types';

import { SkillFileTree } from './SkillFileTree';
import { SkillDetailsNavEntry } from './SkillDetailsNavEntry';
import { SkillNavKey } from '../utils/skillNavigation';

interface ISkillDetailsSidebarProps {
  skill: Skill;
  skills: Skill[];
  activeSection: SkillNavKey;
  onSectionSelect: (value: SkillNavKey) => void;
  onSkillChange: (skillId: string) => void;
  isSkillSelectDisabled: boolean;
  skillsLoading: boolean;
  getPathForNavKey?: (navKey: SkillNavKey) => string | null;
  files?: SkillFile[];
  selectedFilePath?: string | null;
  onFileSelect?: (path: string) => void;
}

export const SkillDetailsSidebar = ({
  skill,
  skills,
  activeSection,
  onSectionSelect,
  onSkillChange,
  isSkillSelectDisabled,
  skillsLoading,
  getPathForNavKey,
  files,
  selectedFilePath,
  onFileSelect,
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

  const distributionsUrl = getPathForNavKey
    ? getPathForNavKey('distributions')
    : null;

  const navEntries = [
    <SkillDetailsNavEntry
      key="distributions"
      label={{ icon: LuGitCommitVertical, text: 'Distribution', gap: 2 }}
      value="distributions"
      isActive={activeSection === 'distributions'}
      onSelect={onSectionSelect}
      url={distributionsUrl ?? undefined}
    />,
  ];

  const showFileTree = files && files.length > 0 && onFileSelect;

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
      <PMVerticalNavSection navEntries={navEntries} />
      {showFileTree && (
        <PMVStack
          align="flex-start"
          px={2}
          gap={2}
          width="full"
          overflow="hidden"
        >
          <SkillFileTree
            files={files}
            selectedFilePath={selectedFilePath ?? null}
            onFileSelect={onFileSelect}
          />
        </PMVStack>
      )}
    </PMVerticalNav>
  );
};
