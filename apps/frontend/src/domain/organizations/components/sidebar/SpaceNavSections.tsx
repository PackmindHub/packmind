import React from 'react';
import { PMBox } from '@packmind/ui';
import {
  LuBookCheck,
  LuEye,
  LuGitPullRequestArrow,
  LuHouse,
  LuPackage,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import { SidebarNavigationDataTestId } from '@packmind/frontend';
import { routes } from '../../../../shared/utils/routes';
import { useGetSpaceBySlugQuery } from '../../../spaces/api/queries/SpacesQueries';
import { useGetGroupedChangeProposalsQuery } from '../../../change-proposals/api/queries/ChangeProposalsQueries';
import { SpaceNavItemLink } from './SpaceNavItemLink';

interface SpaceNavSectionsProps {
  orgSlug: string;
  spaceSlug: string;
}

export function SpaceNavSections({
  orgSlug,
  spaceSlug,
}: Readonly<SpaceNavSectionsProps>): React.ReactElement {
  return (
    <>
      <SpaceNavItemLink
        url={routes.space.toDashboard(orgSlug, spaceSlug)}
        label="Dashboard"
        exact
        icon={<LuHouse />}
      />

      <SectionHeading title="Playbook" />
      <SpaceNavItemLink
        url={routes.space.toStandards(orgSlug, spaceSlug)}
        label="Standards"
        icon={<LuBookCheck />}
      />
      <SpaceNavItemLink
        url={routes.space.toCommands(orgSlug, spaceSlug)}
        label="Commands"
        icon={<LuTerminal />}
      />
      <SpaceNavItemLink
        url={routes.space.toSkills(orgSlug, spaceSlug)}
        label="Skills"
        icon={<LuWandSparkles />}
        data-testid={SidebarNavigationDataTestId.SkillsLink}
      />
      <ReviewChangesNavLink orgSlug={orgSlug} spaceSlug={spaceSlug} />

      <SectionHeading title="Distribution" />
      <SpaceNavItemLink
        url={routes.space.toPackages(orgSlug, spaceSlug)}
        label="Packages"
        icon={<LuPackage />}
        data-testid={SidebarNavigationDataTestId.PackagesLink}
      />
      <SpaceNavItemLink
        url={routes.space.toDeployments(orgSlug, spaceSlug)}
        label="Overview"
        icon={<LuEye />}
        badge={{
          text: 'Enterprise',
          colorScheme: 'purple',
          tooltipLabel: 'Coming soon to the Enterprise plan',
        }}
      />
    </>
  );
}

function SectionHeading({
  title,
}: Readonly<{ title: string }>): React.ReactElement {
  return (
    <PMBox
      paddingLeft={3}
      paddingRight={2}
      paddingBottom={0.5}
      paddingTop={2}
      fontSize="9px"
      fontWeight="medium"
      textTransform="uppercase"
      letterSpacing="wider"
      color="text.faded"
      opacity={0.7}
    >
      {title}
    </PMBox>
  );
}

function ReviewChangesNavLink({
  orgSlug,
  spaceSlug,
}: Readonly<{ orgSlug: string; spaceSlug: string }>): React.ReactElement {
  const { data: space } = useGetSpaceBySlugQuery(spaceSlug);
  const { data: groupedProposals } = useGetGroupedChangeProposalsQuery(
    space?.id,
  );

  const totalArtefacts = groupedProposals
    ? groupedProposals.standards.length +
      groupedProposals.commands.length +
      groupedProposals.skills.length +
      groupedProposals.creations.length
    : 0;

  return (
    <SpaceNavItemLink
      url={routes.space.toReviewChanges(orgSlug, spaceSlug)}
      label="Review changes"
      icon={<LuGitPullRequestArrow />}
      badge={
        totalArtefacts > 0
          ? { text: String(totalArtefacts), colorScheme: 'blue' }
          : undefined
      }
    />
  );
}
