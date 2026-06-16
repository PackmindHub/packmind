import React from 'react';
import { PMBox } from '@packmind/ui';
import {
  LuBookCheck,
  LuHouse,
  LuPackage,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import { SidebarNavigationDataTestId } from '@packmind/frontend';
import { routes } from '../../../../shared/utils/routes';
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
        label="Overview"
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
      <SectionHeading title="Distribution" />
      <SpaceNavItemLink
        url={routes.space.toPackages(orgSlug, spaceSlug)}
        label="Packages"
        icon={<LuPackage />}
        data-testid={SidebarNavigationDataTestId.PackagesLink}
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
