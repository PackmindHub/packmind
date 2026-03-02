import { NavLink, useParams } from 'react-router';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMLink,
  PMText,
  PMVerticalNav,
  PMVerticalNavSection,
  PMAlert,
} from '@packmind/ui';
import {
  CreationProposalOverview,
  ListChangeProposalsBySpaceResponse,
} from '@packmind/types';
import { routes } from '../../../shared/utils/routes';

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
  const to = routes.space.toReviewChangesArtefact(
    orgSlug,
    spaceSlug,
    artefactType,
    artefactId,
  );

  return (
    <NavLink key={artefactId} to={to} prefetch="intent">
      {({ isActive }) => (
        <PMLink
          variant="navbar"
          data-active={isActive ? 'true' : undefined}
          as="span"
          display="flex"
          alignItems="center"
          width="full"
        >
          <PMHStack width="full" justifyContent="space-between" gap={2}>
            <PMText
              fontSize="sm"
              fontWeight={isActive ? 'bold' : 'medium'}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {name}
            </PMText>
            <PMBadge colorPalette="blue" size="sm">
              {changeProposalCount}
            </PMBadge>
          </PMHStack>
        </PMLink>
      )}
    </NavLink>
  );
}

function CreationNavLink({
  proposal,
  orgSlug,
  spaceSlug,
}: {
  proposal: CreationProposalOverview;
  orgSlug: string;
  spaceSlug: string;
}) {
  const to = routes.space.toReviewChangesCreation(
    orgSlug,
    spaceSlug,
    proposal.artefactType,
    proposal.proposalId,
  );

  return (
    <NavLink key={proposal.proposalId} to={to} prefetch="intent">
      {({ isActive }) => (
        <PMLink
          variant="navbar"
          data-active={isActive ? 'true' : undefined}
          as="span"
          display="flex"
          alignItems="center"
          width="full"
        >
          <PMHStack width="full" justifyContent="space-between" gap={2}>
            <PMText
              fontSize="sm"
              fontWeight={isActive ? 'bold' : 'medium'}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {proposal.name}
            </PMText>
            <PMBadge colorPalette="green" size="sm" fontSize="xs">
              New
            </PMBadge>
          </PMHStack>
        </PMLink>
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
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();

  if (!orgSlug || !spaceSlug) {
    return null;
  }

  const commandCreations = groupedProposals.creations.filter(
    (c) => c.artefactType === 'commands',
  );
  const standardCreations = groupedProposals.creations.filter(
    (c) => c.artefactType === 'standards',
  );

  const hasCommands =
    groupedProposals.commands.length > 0 || commandCreations.length > 0;

  const commandNavEntries = [
    ...commandCreations.map((proposal) => (
      <CreationNavLink
        key={proposal.proposalId}
        proposal={proposal}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    )),
    ...groupedProposals.commands.map((item) => (
      <ArtefactNavLink
        key={item.artefactId}
        artefactId={item.artefactId}
        name={item.name}
        changeProposalCount={item.changeProposalCount}
        artefactType="commands"
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    )),
  ];

  const standardNavEntries = [
    ...standardCreations.map((proposal) => (
      <CreationNavLink
        key={proposal.proposalId}
        proposal={proposal}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    )),
    ...groupedProposals.standards.map((item) => (
      <ArtefactNavLink
        key={item.artefactId}
        artefactId={item.artefactId}
        name={item.name}
        changeProposalCount={item.changeProposalCount}
        artefactType="standards"
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    )),
  ];

  const hasStandards =
    groupedProposals.standards.length > 0 || standardCreations.length > 0;

  const skillNavEntries = groupedProposals.skills.map((item) => (
    <ArtefactNavLink
      key={item.artefactId}
      artefactId={item.artefactId}
      name={item.name}
      changeProposalCount={item.changeProposalCount}
      artefactType="skills"
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
    />
  ));

  return (
    <PMVerticalNav logo={false} showLogoContainer={false} width="270px">
      {hasCommands && (
        <PMVerticalNavSection title="Commands" navEntries={commandNavEntries} />
      )}
      {hasStandards && (
        <PMVerticalNavSection
          title="Standards"
          navEntries={standardNavEntries}
        />
      )}
      {skillNavEntries.length > 0 && (
        <PMVerticalNavSection title="Skills" navEntries={skillNavEntries} />
      )}
      <PMBox p={4} mt="auto">
        <PMAlert.Root status="info">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Description>
              Playbook update management will soon require an Enterprise plan.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      </PMBox>
    </PMVerticalNav>
  );
}
