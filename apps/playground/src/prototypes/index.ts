import { ComponentType } from 'react';
import ButtonsPrototype from './ButtonsPrototype';
import ReviewChangesGroupViewPrototype from './review-changes-group-view/ReviewChangesGroupViewPrototype';
import ReviewChangesDrillDownViewPrototype from './review-changes-drill-down-view/ReviewChangesDrillDownViewPrototype';
import ArtifactRemovedPrototype from './artifact-removed/ArtifactRemovedPrototype';

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
];
