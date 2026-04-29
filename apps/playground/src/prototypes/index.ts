import { ComponentType } from 'react';
import ButtonsPrototype from './ButtonsPrototype';
import ReviewChangesGroupViewPrototype from './review-changes-group-view/ReviewChangesGroupViewPrototype';
import ReviewChangesDrillDownViewPrototype from './review-changes-drill-down-view/ReviewChangesDrillDownViewPrototype';
import ArtifactRemovedPrototype from './artifact-removed/ArtifactRemovedPrototype';
import SidebarWithSpacesPrototype from './sidebar-with-spaces/SidebarWithSpacesPrototype';
import StandardDetailRedesignPrototype from './standard-detail-redesign/StandardDetailRedesignPrototype';
import PersonalHomePagePrototype from './personal-home-page/PersonalHomePagePrototype';
import SpacesManagementPrototype from './spaces-management/SpacesManagementPrototype';

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
];
