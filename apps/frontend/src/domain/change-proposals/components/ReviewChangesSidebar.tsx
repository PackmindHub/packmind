import React, { useMemo, useState } from 'react';
import { NavLink, useParams, useSearchParams } from 'react-router';
import {
  PMBox,
  PMCloseButton,
  PMDialog,
  PMFlex,
  PMHStack,
  PMIcon,
  PMLink,
  PMText,
  PMTooltip,
  PMVerticalNav,
  PMVerticalNavSection,
  PMVStack,
} from '@packmind/ui';
import { LuInfo } from 'react-icons/lu';
import { ReviewChangesBlankState } from './ReviewChangesBlankState';
import {
  ChangeProposalType,
  CollectionItemAddPayload,
  ListChangeProposalsBySpaceResponse,
  SkillCreationProposalOverview,
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

function NavBadge({
  children,
  minWidth,
  px,
}: {
  children: React.ReactNode;
  minWidth?: string;
  px?: number;
}) {
  return (
    <PMFlex
      alignItems="center"
      justifyContent="center"
      bg="yellow.800"
      color="yellow.200"
      borderRadius="full"
      minWidth={minWidth}
      px={px}
      height="24px"
      fontSize="xs"
      fontWeight="bold"
      flexShrink={0}
    >
      {children}
    </PMFlex>
  );
}

function SidebarNavLink({
  to,
  name,
  artefactType,
  badge,
}: {
  to: string;
  name: string;
  artefactType: string;
  badge: React.ReactNode;
}) {
  const typeLabel = artefactTypeLabels[artefactType] ?? artefactType;

  return (
    <NavLink to={to} prefetch="intent">
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
              {badge}
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
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const { orgSlug, spaceSlug, artefactType, artefactId, proposalId } =
    useParams<{
      orgSlug: string;
      spaceSlug: string;
      artefactType: string;
      artefactId: string;
      proposalId: string;
    }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSkillSelected = artefactType === 'skills' && !!artefactId;
  const isSkillCreationSelected =
    artefactType === 'skills' && !artefactId && !!proposalId;
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
    return Array.from(pathSet).sort((a, b) => a.localeCompare(b));
  }, [isSkillSelected, files, proposals]);

  const filePathsWithChanges = useMemo(
    () =>
      isSkillSelected
        ? getFilePathsWithChanges(proposals, files)
        : new Set<string>(),
    [isSkillSelected, proposals, files],
  );

  const skillCreation = useMemo(() => {
    if (!isSkillCreationSelected) return undefined;
    return groupedProposals.creations.find(
      (c): c is SkillCreationProposalOverview =>
        c.id === proposalId && c.artefactType === 'skills',
    );
  }, [isSkillCreationSelected, groupedProposals.creations, proposalId]);

  const creationFilePaths = useMemo(() => {
    if (!skillCreation?.payload.files) return [];
    return skillCreation.payload.files
      .map((f) => f.path)
      .filter((p) => p !== 'SKILL.md')
      .sort((a, b) => a.localeCompare(b));
  }, [skillCreation]);

  const creationFilePathsWithChanges = useMemo(
    () => new Set(creationFilePaths),
    [creationFilePaths],
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
  ].sort((a, b) => b.lastContributedAt.localeCompare(a.lastContributedAt));

  const sortedCreations = [...(groupedProposals.creations ?? [])].sort((a, b) =>
    b.lastContributedAt.localeCompare(a.lastContributedAt),
  );

  return (
    <PMVerticalNav logo={false} showLogoContainer={false} width="270px">
      <PMBox flex={1} minH={0} overflowY="auto">
        <PMVerticalNavSection
          title="CHANGES TO REVIEW"
          titleExtra={
            <>
              <PMBox
                display="inline-flex"
                cursor="pointer"
                onClick={() => setIsInfoDialogOpen(true)}
              >
                <PMIcon as={LuInfo} color="faded" />
              </PMBox>
              <PMDialog.Root
                open={isInfoDialogOpen}
                onOpenChange={(details) => setIsInfoDialogOpen(details.open)}
                size="xl"
                scrollBehavior="inside"
              >
                <PMDialog.Backdrop />
                <PMDialog.Positioner>
                  <PMDialog.Content>
                    <PMDialog.Header>
                      <PMDialog.Title>
                        How to submit playbook changes
                      </PMDialog.Title>
                      <PMDialog.CloseTrigger asChild>
                        <PMCloseButton />
                      </PMDialog.CloseTrigger>
                    </PMDialog.Header>
                    <PMDialog.Body>
                      <ReviewChangesBlankState />
                    </PMDialog.Body>
                  </PMDialog.Content>
                </PMDialog.Positioner>
              </PMDialog.Root>
            </>
          }
          navEntries={[
            ...allItems.map((item) => (
              <PMBox
                key={`artefact-${item.artefactId}`}
                borderBottom="1px solid"
                borderColor="{colors.border.tertiary}"
              >
                <SidebarNavLink
                  to={routes.space.toReviewChangesArtefact(
                    orgSlug,
                    spaceSlug,
                    item.artefactType,
                    item.artefactId,
                  )}
                  name={item.name}
                  artefactType={item.artefactType}
                  badge={
                    <NavBadge minWidth="24px">
                      {item.changeProposalCount}
                    </NavBadge>
                  }
                />
              </PMBox>
            )),
            ...sortedCreations.map((item) => (
              <PMBox
                key={`creation-${item.id}`}
                borderBottom="1px solid"
                borderColor="{colors.border.tertiary}"
              >
                <SidebarNavLink
                  to={routes.space.toReviewChangesCreation(
                    orgSlug,
                    spaceSlug,
                    item.artefactType,
                    item.id,
                  )}
                  name={item.name}
                  artefactType={item.artefactType}
                  badge={<NavBadge px={2}>New</NavBadge>}
                />
              </PMBox>
            )),
          ]}
        />
      </PMBox>

      {isSkillSelected && allFilePaths.length > 0 && (
        <PMBox flex={1} minH={0} overflowY="auto" px={4}>
          <PMText
            fontSize="xs"
            color="faded"
            fontWeight="bold"
            textTransform="uppercase"
            mb={2}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {skillData?.skill?.name ?? 'Skill'}
          </PMText>
          <SkillFileFilterTree
            allFilePaths={allFilePaths}
            filePathsWithChanges={filePathsWithChanges}
            selectedFilter={selectedFilter}
            onFilterSelect={handleFilterSelect}
          />
        </PMBox>
      )}

      {isSkillCreationSelected && creationFilePaths.length > 0 && (
        <PMBox flex={1} minH={0} overflowY="auto" px={4}>
          <PMText
            fontSize="xs"
            color="faded"
            fontWeight="bold"
            textTransform="uppercase"
            mb={2}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {skillCreation?.name ?? 'Skill'}
          </PMText>
          <SkillFileFilterTree
            allFilePaths={creationFilePaths}
            filePathsWithChanges={creationFilePathsWithChanges}
            selectedFilter={selectedFilter}
            onFilterSelect={handleFilterSelect}
          />
        </PMBox>
      )}
    </PMVerticalNav>
  );
}
