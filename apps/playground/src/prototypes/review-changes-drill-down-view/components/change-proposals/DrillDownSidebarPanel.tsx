import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMLink,
  PMBox,
  PMHStack,
  PMText,
  PMVStack,
  PMIcon,
} from '@packmind/ui';
import { LuArrowLeft } from 'react-icons/lu';
import {
  StubGroup,
  StubGroupArtefact,
  ARTEFACT_TYPE_LABEL,
} from '../../../review-changes-group-view/types';
import { NavBadge } from '../../../review-changes-group-view/components/change-proposals/shared/NavBadge';
import {
  SkillFileFilterTree,
  getUniqueFilePaths,
} from '../../../review-changes-group-view/components/change-proposals/SkillFileFilterTree';

function proposalCountForGroup(group: StubGroup): number {
  return group.artefacts.reduce((sum, a) => sum + a.proposals.length, 0);
}

function totalProposalCount(groups: StubGroup[]): number {
  return groups.reduce((sum, g) => sum + proposalCountForGroup(g), 0);
}

export type SidebarView =
  | { level: 'groups' }
  | { level: 'all-artifacts' }
  | { level: 'artifacts'; groupId: string };

export function DrillDownSidebarPanel({
  groups,
  view,
  onNavigate,
  selectedArtefactId,
  onSelectArtefact,
  selectedFilePath,
  onSelectFilePath,
}: {
  groups: StubGroup[];
  view: SidebarView;
  onNavigate: (view: SidebarView) => void;
  selectedArtefactId: string | null;
  onSelectArtefact: (id: string) => void;
  selectedFilePath: string | null;
  onSelectFilePath: (path: string | null) => void;
}) {
  const selectedGroup =
    view.level === 'artifacts'
      ? groups.find((g) => g.id === view.groupId)
      : null;

  const allArtefacts = groups.flatMap((g) => g.artefacts);
  const artefactsToShow =
    view.level === 'all-artifacts'
      ? allArtefacts
      : (selectedGroup?.artefacts ?? []);

  const selectedArtefact = allArtefacts.find(
    (a) => a.id === selectedArtefactId,
  );
  const isSkillSelected = selectedArtefact?.artefactType === 'skill';
  const skillFilePaths = isSkillSelected
    ? getUniqueFilePaths(selectedArtefact.proposals)
    : [];

  return (
    <PMVerticalNav logo={false} showLogoContainer={false} width="270px">
      <PMBox flex={1} minH={0} overflowY="auto">
        {view.level === 'groups' ? (
          <>
            {/* "All changes" entry */}
            <PMVerticalNavSection
              navEntries={[
                <AllChangesNavEntry
                  key="all"
                  totalCount={totalProposalCount(groups)}
                  onSelect={() => onNavigate({ level: 'all-artifacts' })}
                />,
              ]}
            />

            {/* Groups list */}
            <PMText
              fontSize="xs"
              fontWeight="bold"
              color="tertiary"
              px={2}
              mt={4}
              mb={2}
              as="p"
            >
              GROUPS
            </PMText>
            <PMVerticalNavSection
              navEntries={groups.map((group) => (
                <GroupNavEntry
                  key={group.id}
                  group={group}
                  onSelect={() =>
                    onNavigate({ level: 'artifacts', groupId: group.id })
                  }
                />
              ))}
            />
          </>
        ) : (
          <>
            {/* Back button */}
            <PMBox
              cursor="pointer"
              onClick={() => onNavigate({ level: 'groups' })}
              px={3}
              py={2}
              _hover={{ bg: '{colors.background.secondary}' }}
              borderBottom="1px solid"
              borderColor="{colors.border.tertiary}"
            >
              <PMHStack gap={2} alignItems="center">
                <PMIcon color="text.faded" fontSize="sm">
                  <LuArrowLeft />
                </PMIcon>
                <PMText fontSize="sm" color="secondary">
                  {view.level === 'all-artifacts'
                    ? 'Back to groups'
                    : 'All groups'}
                </PMText>
              </PMHStack>
            </PMBox>

            {/* Group header context (only when scoped to a group) */}
            {selectedGroup && (
              <PMBox
                px={3}
                py={3}
                borderBottom="1px solid"
                borderColor="{colors.border.tertiary}"
              >
                <PMVStack gap={0} alignItems="flex-start">
                  <PMText fontSize="sm" fontWeight="bold">
                    {selectedGroup.message}
                  </PMText>
                  <PMText fontSize="xs" opacity={0.5}>
                    {selectedGroup.author} &middot; {selectedGroup.createdAt}
                  </PMText>
                </PMVStack>
              </PMBox>
            )}

            {/* Section title — only for all-artifacts mode */}
            {view.level === 'all-artifacts' && (
              <PMText
                fontSize="xs"
                fontWeight="bold"
                color="secondary"
                px={2}
                mt={4}
                mb={2}
              >
                ALL CHANGES
              </PMText>
            )}
            <PMVerticalNavSection
              navEntries={artefactsToShow.map((artefact) => (
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

            {/* Skill file filter */}
            {isSkillSelected && (
              <SkillFileFilterTree
                filePaths={skillFilePaths}
                selectedFilePath={selectedFilePath}
                onFileSelect={onSelectFilePath}
              />
            )}
          </>
        )}
      </PMBox>
    </PMVerticalNav>
  );
}

function AllChangesNavEntry({
  totalCount,
  onSelect,
}: {
  totalCount: number;
  onSelect: () => void;
}) {
  return (
    <PMBox
      mx={-2}
      borderBottom="1px solid"
      borderColor="{colors.border.tertiary}"
      cursor="pointer"
      onClick={onSelect}
    >
      <PMLink variant="navbar" as="span" display="block" width="full" py={2}>
        <PMHStack width="full" justifyContent="space-between" gap={2} minW={0}>
          <PMText fontSize="sm" fontWeight="medium">
            All changes
          </PMText>
          <NavBadge>{totalCount}</NavBadge>
        </PMHStack>
      </PMLink>
    </PMBox>
  );
}

function GroupNavEntry({
  group,
  onSelect,
}: {
  group: StubGroup;
  onSelect: () => void;
}) {
  return (
    <PMBox
      mx={-2}
      borderBottom="1px solid"
      borderColor="{colors.border.tertiary}"
      cursor="pointer"
      onClick={onSelect}
    >
      <PMLink variant="navbar" as="span" display="block" width="full" py={2}>
        <PMHStack width="full" justifyContent="space-between" gap={2} minW={0}>
          <PMVStack gap={0} flex={1} minW={0} alignItems="flex-start">
            <PMText
              fontSize="sm"
              fontWeight="medium"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              maxW="100%"
            >
              {group.message}
            </PMText>
            <PMText fontSize="xs" opacity={0.5} fontWeight="normal">
              {group.author} &middot; {group.createdAt} &middot;{' '}
              {group.artefacts.length} artifact
              {group.artefacts.length !== 1 ? 's' : ''}
            </PMText>
          </PMVStack>
          <NavBadge>{proposalCountForGroup(group)}</NavBadge>
        </PMHStack>
      </PMLink>
    </PMBox>
  );
}

function ArtefactNavEntry({
  artefact,
  isSelected,
  onSelect,
}: {
  artefact: StubGroupArtefact;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <PMBox
      mx={-2}
      borderBottom="1px solid"
      borderColor="{colors.border.tertiary}"
      cursor="pointer"
      onClick={onSelect}
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
