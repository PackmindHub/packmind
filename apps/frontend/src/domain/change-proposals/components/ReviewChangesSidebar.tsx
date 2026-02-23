import { NavLink, useParams } from 'react-router';
import {
  PMAlert,
  PMBadge,
  PMBox,
  PMHStack,
  PMLink,
  PMText,
  PMVerticalNav,
  PMVerticalNavSection,
} from '@packmind/ui';
import { ListChangeProposalsBySpaceResponse } from '@packmind/types';
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
        >
          <PMHStack width="full" justifyContent="space-between" gap={2}>
            <PMText
              fontSize="sm"
              fontWeight={isActive ? 'bold' : 'medium'}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              flex={1}
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

  const sectionConfig = [
    { key: 'commands', title: 'Commands', items: groupedProposals.commands },
    {
      key: 'standards',
      title: 'Standards',
      items: groupedProposals.standards,
    },
    { key: 'skills', title: 'Skills', items: groupedProposals.skills },
  ] as const;

  const sections = sectionConfig
    .filter(({ items }) => items.length > 0)
    .map(({ key, title, items }) => (
      <PMVerticalNavSection
        key={key}
        title={title}
        navEntries={items.map((item) => (
          <ArtefactNavLink
            key={item.artefactId}
            artefactId={item.artefactId}
            name={item.name}
            changeProposalCount={item.changeProposalCount}
            artefactType={key}
            orgSlug={orgSlug}
            spaceSlug={spaceSlug}
          />
        ))}
      />
    ));

  return (
    <PMVerticalNav logo={false} showLogoContainer={false} width="270px">
      {sections}
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
