import { useMemo } from 'react';
import { NavLink, useParams, useSearchParams } from 'react-router';
import {
  PMBox,
  PMFlex,
  PMHeading,
  PMHStack,
  PMLink,
  PMText,
  PMTooltip,
  PMVerticalNav,
  PMVerticalNavSection,
  PMVStack,
} from '@packmind/ui';
import {
  ChangeProposalType,
  CollectionItemAddPayload,
  ListChangeProposalsBySpaceResponse,
  SkillFile,
  SkillId,
} from '@packmind/types';
import { routes } from '../../../shared/utils/routes';
import { useGetSkillWithFilesByIdQuery } from '../../skills/api/queries/SkillsQueries';
import { useListChangeProposalsBySkillQuery } from '../api/queries/ChangeProposalsQueries';
import { getFilePathsWithChanges } from '../utils/filterProposalsByFilePath';
import { SkillFileFilterTree } from './SkillReviewDetail/SkillFileFilterTree';

const artefactTypeLabels: Record<string, string> = {
  commands: 'Command',
  standards: 'Standard',
  skills: 'Skill',
};

function ArtefactNavLink({
  artefactId,
  name,
  changeProposalCount,
  artefactType,
  orgSlug,
  spaceSlug,
}: {
  artefactId: string;
  name: string;
  changeProposalCount: number;
  artefactType: string;
  orgSlug: string;
  spaceSlug: string;
}) {
  const typeLabel = artefactTypeLabels[artefactType] ?? artefactType;

  return (
    <NavLink
      key={artefactId}
      to={routes.space.toReviewChangesArtefact(
        orgSlug,
        spaceSlug,
        artefactType,
        artefactId,
      )}
      prefetch="intent"
    >
      {({ isActive }) => (
        <PMTooltip label={name} placement="bottom-start" openDelay={300}>
          <PMLink
            variant="navbar"
            data-active={isActive ? 'true' : undefined}
            as="span"
            display="flex"
            alignItems="center"
            width="full"
            py={2}
          >
            <PMHStack
              width="full"
              justifyContent="space-between"
              gap={2}
              minW={0}
            >
              <PMVStack gap={0} flex={1} minW={0} alignItems="flex-start">
                <PMText
                  fontSize="sm"
                  fontWeight={isActive ? 'bold' : 'medium'}
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  maxW="100%"
                >
                  {name}
                </PMText>
                <PMText fontSize="xs" opacity={0.5} fontWeight="normal">
                  {typeLabel}
                </PMText>
              </PMVStack>
              <PMFlex
                alignItems="center"
                justifyContent="center"
                bg="yellow.800"
                color="yellow.200"
                borderRadius="full"
                minWidth="24px"
                height="24px"
                fontSize="xs"
                fontWeight="bold"
                flexShrink={0}
              >
                {changeProposalCount}
              </PMFlex>
            </PMHStack>
          </PMLink>
        </PMTooltip>
      )}
    </NavLink>
  );
}

interface ReviewChangesSidebarProps {
  groupedProposals: ListChangeProposalsBySpaceResponse;
}

export function ReviewChangesSidebar({
  groupedProposals,
}: ReviewChangesSidebarProps) {
  const { orgSlug, spaceSlug, artefactType, artefactId } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    artefactType: string;
    artefactId: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSkillSelected = artefactType === 'skills' && !!artefactId;
  const skillId = isSkillSelected ? (artefactId as SkillId) : undefined;

  const { data: skillData } = useGetSkillWithFilesByIdQuery(skillId);
  const { data: proposalsData } = useListChangeProposalsBySkillQuery(skillId);

  const files = skillData?.files ?? [];
  const proposals = proposalsData?.changeProposals ?? [];

  const allFilePaths = useMemo(() => {
    if (!isSkillSelected) return [];

    const existingPaths = files
      .filter((f) => f.path !== 'SKILL.md')
      .map((f) => f.path);

    const addFilePaths = proposals
      .filter((p) => p.type === ChangeProposalType.addSkillFile)
      .map((p) => {
        const payload = p.payload as CollectionItemAddPayload<
          Omit<SkillFile, 'id' | 'skillVersionId'>
        >;
        return payload.item.path;
      })
      .filter((path) => path !== 'SKILL.md');

    const pathSet = new Set([...existingPaths, ...addFilePaths]);
    return Array.from(pathSet).sort();
  }, [isSkillSelected, files, proposals]);

  const filePathsWithChanges = useMemo(
    () =>
      isSkillSelected
        ? getFilePathsWithChanges(proposals, files)
        : new Set<string>(),
    [isSkillSelected, proposals, files],
  );

  const selectedFilter = searchParams.get('file') ?? '';
  const handleFilterSelect = (filter: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (filter) {
          next.set('file', filter);
        } else {
          next.delete('file');
        }
        return next;
      },
      { replace: true },
    );
  };

  if (!orgSlug || !spaceSlug) {
    return null;
  }

  const allItems = [
    ...groupedProposals.commands.map((item) => ({
      ...item,
      artefactType: 'commands' as const,
    })),
    ...groupedProposals.standards.map((item) => ({
      ...item,
      artefactType: 'standards' as const,
    })),
    ...groupedProposals.skills.map((item) => ({
      ...item,
      artefactType: 'skills' as const,
    })),
  ];

  return (
    <PMVerticalNav logo={false} showLogoContainer={false} width="270px">
      <PMBox flex={1} minH={0} overflowY="auto">
        <PMVerticalNavSection
          title="CHANGES TO REVIEW"
          navEntries={allItems.map((item) => (
            <PMBox
              key={item.artefactId}
              borderBottom="1px solid"
              borderColor="{colors.border.tertiary}"
            >
              <ArtefactNavLink
                artefactId={item.artefactId}
                name={item.name}
                changeProposalCount={item.changeProposalCount}
                artefactType={item.artefactType}
                orgSlug={orgSlug}
                spaceSlug={spaceSlug}
              />
            </PMBox>
          ))}
        />
      </PMBox>

      {isSkillSelected && allFilePaths.length > 0 && (
        <PMBox flex={1} minH={0} overflowY="auto" px={4}>
          <PMHeading level="h6" color="faded" mb={2}>
            FILE FILTER
          </PMHeading>
          <SkillFileFilterTree
            allFilePaths={allFilePaths}
            filePathsWithChanges={filePathsWithChanges}
            selectedFilter={selectedFilter}
            onFilterSelect={handleFilterSelect}
          />
        </PMBox>
      )}
    </PMVerticalNav>
  );
}
