import { ChangeEvent, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  PMBox,
  PMIcon,
  PMLink,
  PMNativeSelect,
  PMText,
  PMVerticalNav,
  PMVerticalNavSection,
  PMVStack,
} from '@packmind/ui';
import { LuGitCommitVertical } from 'react-icons/lu';

import type { Skill, SkillFile } from '@packmind/types';
import { routes } from '../../../shared/utils/routes';

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
  orgSlug?: string;
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
  orgSlug,
}: ISkillDetailsSidebarProps) => {
  const navigate = useNavigate();
  const { spaceSlug } = useParams<{ spaceSlug?: string }>();

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

  const handleDistributionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (orgSlug && spaceSlug) {
      navigate(routes.space.toSkillDeployment(orgSlug, spaceSlug, skill.slug));
    }
  };

  const selectDisabled =
    isSkillSelectDisabled || skillsLoading || skillSelectItems.length === 0;

  const distributionNavEntries = [
    <PMLink
      key="distribution"
      variant="navbar"
      as="button"
      width="full"
      textAlign="left"
      py={2}
      type="button"
      display="flex"
      alignItems="center"
      textDecoration="none"
      fontWeight="medium"
      onClick={handleDistributionClick}
      _hover={{ fontWeight: 'medium', textDecoration: 'none' }}
      _focus={{ outline: 'none', boxShadow: 'none' }}
      _focusVisible={{ outline: 'none', boxShadow: 'none' }}
    >
      <PMText
        width="full"
        fontSize="sm"
        fontWeight="medium"
        display="inline-flex"
        alignItems="center"
        gap={2}
      >
        <PMIcon as="span" display="inline-flex">
          <LuGitCommitVertical />
        </PMIcon>
        Distribution
      </PMText>
    </PMLink>,
  ];

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
      <PMVerticalNavSection navEntries={distributionNavEntries} />
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
