import { ComponentType } from 'react';
import ButtonsPrototype from './ButtonsPrototype';
import ReviewChangesGroupViewPrototype from './review-changes-group-view/ReviewChangesGroupViewPrototype';
import ReviewChangesDrillDownViewPrototype from './review-changes-drill-down-view/ReviewChangesDrillDownViewPrototype';
import ArtifactRemovedPrototype from './artifact-removed/ArtifactRemovedPrototype';
import SidebarWithSpacesPrototype from './sidebar-with-spaces/SidebarWithSpacesPrototype';
import StandardDetailRedesignPrototype from './standard-detail-redesign/StandardDetailRedesignPrototype';
import PersonalHomePagePrototype from './personal-home-page/PersonalHomePagePrototype';
import SpacesManagementPrototype from './spaces-management/SpacesManagementPrototype';
import MarketplacesPrototype from './marketplaces/MarketplacesPrototype';
import MarketplaceDetailPrototype from './marketplace-detail/MarketplaceDetailPrototype';
import GitConnectionsPrototype from './git-connections/GitConnectionsPrototype';

export interface Prototype {
  name: string;
  description?: string;
  component: ComponentType;
}

export const prototypes: Prototype[] = [
  { name: 'Buttons', component: ButtonsPrototype },
  {
    name: 'Review changes - group view (A: filter)',
    component: ReviewChangesGroupViewPrototype,
  },
  {
    name: 'Review changes - group view (C: drill-down)',
    component: ReviewChangesDrillDownViewPrototype,
  },
  {
    name: 'Artifact removed — current UI',
    description: 'Reproduction of the current removal change proposal UI',
    component: ArtifactRemovedPrototype,
  },
  {
    name: 'Sidebar with spaces',
    description: 'Organization sidebar with spaces navigation',
    component: SidebarWithSpacesPrototype,
  },
  {
    name: 'Standard detail — redesign',
    description:
      'Content-first standard page with tabs and rule drawer instead of sidebar',
    component: StandardDetailRedesignPrototype,
  },
  {
    name: 'Personal home page',
    description:
      'Cross-space personal hub with pending review triage and tips discovery',
    component: PersonalHomePagePrototype,
  },
  {
    name: 'Spaces management',
    description:
      'Org-settings surface for managing all spaces \u2014 dense table with a side drawer for per-space General/Members/Danger edits',
    component: SpacesManagementPrototype,
  },
  {
    name: 'Marketplaces',
    description:
      'Governance-first index of Git-backed marketplaces that publish Packmind packages to Claude Code and Copilot',
    component: MarketplacesPrototype,
  },
  {
    name: 'Marketplace detail',
    description:
      'Detail page of a single marketplace: master/detail split between plugin list and selected-plugin content with owner space, version, mandatory flag, and bundled artifacts',
    component: MarketplaceDetailPrototype,
  },
  {
    name: 'Git connections — redesign',
    description:
      'Settings/git redesign: connections vs CLI-managed tabs, display names, health + last push, duplicate-repo warnings, no webhooks',
    component: GitConnectionsPrototype,
  },
];
