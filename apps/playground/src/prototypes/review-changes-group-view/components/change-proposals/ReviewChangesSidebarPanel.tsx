import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMLink,
  PMBox,
  PMHStack,
  PMText,
  PMVStack,
  PMSegmentGroup,
  PMIcon,
} from '@packmind/ui';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';
import {
  StubGroup,
  StubGroupArtefact,
  ReviewMode,
  ARTEFACT_TYPE_LABEL,
} from '../../types';
import { NavBadge } from './shared/NavBadge';
import { SkillFileFilterTree, getUniqueFilePaths } from './SkillFileFilterTree';

function proposalCountForGroup(group: StubGroup): number {
  return group.artefacts.reduce((sum, a) => sum + a.proposals.length, 0);
}

export function ReviewChangesSidebarPanel({
  mode,
  onModeChange,
  groups,
  selectedGroupId,
  onSelectGroup,
  selectedArtefactId,
  onSelectArtefact,
  selectedFilePath,
  onSelectFilePath,
}: {
  mode: ReviewMode;
  onModeChange: (mode: ReviewMode) => void;
  groups: StubGroup[];
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
  selectedArtefactId: string | null;
  onSelectArtefact: (id: string) => void;
  selectedFilePath: string | null;
  onSelectFilePath: (path: string | null) => void;
}) {
  const allArtefacts = groups.flatMap((g) => g.artefacts);
  const selectedArtefact = allArtefacts.find(
    (a) => a.id === selectedArtefactId,
  );
  const isSkillSelected = selectedArtefact?.artefactType === 'skill';
  const skillFilePaths = isSkillSelected
    ? getUniqueFilePaths(selectedArtefact.proposals)
    : [];

  return (
    <PMVerticalNav logo={false} showLogoContainer={false} width="270px">
      {/* Mode toggle */}
      <PMBox px={3} pb={2} display="flex" justifyContent="center">
        <PMSegmentGroup.Root
          size="xs"
          value={mode}
          onValueChange={(e) => onModeChange(e.value as ReviewMode)}
        >
          <PMSegmentGroup.Indicator bg="background.tertiary" />
          {[
            { label: 'By artifact', value: 'artifact' },
            { label: 'By group', value: 'group' },
          ].map((item) => (
            <PMSegmentGroup.Item
              key={item.value}
              value={item.value}
              _checked={{ color: 'text.primary' }}
            >
              <PMSegmentGroup.ItemText>{item.label}</PMSegmentGroup.ItemText>
              <PMSegmentGroup.ItemHiddenInput />
            </PMSegmentGroup.Item>
          ))}
        </PMSegmentGroup.Root>
      </PMBox>

      {/* List content */}
      <PMBox flex={1} minH={0} overflowY="auto">
        {mode === 'artifact' ? (
          <>
            <PMVerticalNavSection
              title="CHANGES TO REVIEW"
              navEntries={allArtefacts.map((artefact) => (
                <ArtefactNavEntry
                  key={artefact.id}
                  artefact={artefact}
                  isSelected={selectedArtefactId === artefact.id}
                  onSelect={() => {
                    onSelectArtefact(artefact.id);
                    onSelectFilePath(null);
                  }}
                />
              ))}
            />
            {isSkillSelected && (
              <SkillFileFilterTree
                filePaths={skillFilePaths}
                selectedFilePath={selectedFilePath}
                onFileSelect={onSelectFilePath}
              />
            )}
          </>
        ) : (
          <PMBox>
            {groups.map((group) => {
              const isGroupExpanded = selectedGroupId === group.id;
              return (
                <PMBox key={group.id}>
                  {/* Group header — click to expand/collapse */}
                  <GroupNavHeader
                    group={group}
                    isExpanded={isGroupExpanded}
                    onToggle={() => onSelectGroup(group.id)}
                  />

                  {/* Artifacts under this group */}
                  {isGroupExpanded && (
                    <PMBox>
                      {group.artefacts.map((artefact) => (
                        <ArtefactNavEntry
                          key={artefact.id}
                          artefact={artefact}
                          isSelected={selectedArtefactId === artefact.id}
                          onSelect={() => {
                            onSelectArtefact(artefact.id);
                            onSelectFilePath(null);
                          }}
                          indented
                        />
                      ))}
                    </PMBox>
                  )}
                </PMBox>
              );
            })}

            {/* Skill file filter — shown below groups when a skill is selected */}
            {isSkillSelected && (
              <SkillFileFilterTree
                filePaths={skillFilePaths}
                selectedFilePath={selectedFilePath}
                onFileSelect={onSelectFilePath}
              />
            )}
          </PMBox>
        )}
      </PMBox>
    </PMVerticalNav>
  );
}

function ArtefactNavEntry({
  artefact,
  isSelected,
  onSelect,
  indented = false,
}: {
  artefact: StubGroupArtefact;
  isSelected: boolean;
  onSelect: () => void;
  indented?: boolean;
}) {
  return (
    <PMBox
      borderBottom="1px solid"
      borderColor="{colors.border.tertiary}"
      cursor="pointer"
      onClick={onSelect}
      pl={indented ? 6 : 0}
    >
      <PMLink
        variant="navbar"
        data-active={isSelected ? 'true' : undefined}
        as="span"
        display="flex"
        alignItems="center"
        width="full"
        py={2}
      >
        <PMHStack width="full" justifyContent="space-between" gap={2} minW={0}>
          <PMVStack gap={0} flex={1} minW={0} alignItems="flex-start">
            <PMText
              fontSize="sm"
              fontWeight={isSelected ? 'bold' : 'medium'}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              maxW="100%"
            >
              {artefact.name}
            </PMText>
            <PMText fontSize="xs" opacity={0.5} fontWeight="normal">
              {ARTEFACT_TYPE_LABEL[artefact.artefactType]}
            </PMText>
          </PMVStack>
          <NavBadge>{artefact.proposals.length}</NavBadge>
        </PMHStack>
      </PMLink>
    </PMBox>
  );
}

function GroupNavHeader({
  group,
  isExpanded,
  onToggle,
}: {
  group: StubGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <PMBox
      cursor="pointer"
      onClick={onToggle}
      px={3}
      py={2}
      bg={isExpanded ? '{colors.background.secondary}' : undefined}
      _hover={{ bg: '{colors.background.secondary}' }}
      transition="background 0.1s"
      borderBottom="1px solid"
      borderColor="{colors.border.tertiary}"
    >
      <PMHStack gap={2} alignItems="center" justifyContent="space-between">
        <PMHStack gap={2} flex={1} minW={0} alignItems="center">
          <PMIcon color="text.faded" fontSize="xs" flexShrink={0}>
            {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
          </PMIcon>
          <PMVStack gap={0} flex={1} minW={0} alignItems="flex-start">
            <PMText
              fontSize="sm"
              fontWeight="semibold"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              maxW="100%"
            >
              {group.message}
            </PMText>
            <PMText fontSize="xs" opacity={0.5} fontWeight="normal">
              {group.author} &middot; {group.createdAt}
            </PMText>
          </PMVStack>
        </PMHStack>
        <NavBadge>{proposalCountForGroup(group)}</NavBadge>
      </PMHStack>
    </PMBox>
  );
}
