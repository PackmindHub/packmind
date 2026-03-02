import { NavLink, useParams } from 'react-router';
import {
  PMAlert,
  PMBox,
  PMFlex,
  PMHStack,
  PMLink,
  PMText,
  PMVerticalNav,
  PMVerticalNavSection,
  PMVStack,
} from '@packmind/ui';
import { ListChangeProposalsBySpaceResponse } from '@packmind/types';
import { routes } from '../../../shared/utils/routes';

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
        <PMLink
          variant="navbar"
          data-active={isActive ? 'true' : undefined}
          as="span"
          display="flex"
          alignItems="center"
          width="full"
          py={2}
        >
          <PMHStack width="full" justifyContent="space-between" gap={2}>
            <PMVStack
              gap={0}
              flex={1}
              overflow="hidden"
              alignItems="flex-start"
            >
              <PMText
                fontSize="sm"
                fontWeight={isActive ? 'bold' : 'medium'}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
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
