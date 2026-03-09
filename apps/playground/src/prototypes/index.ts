import { ComponentType } from 'react';
import ButtonsPrototype from './ButtonsPrototype';
import ReviewChangesGroupViewPrototype from './ReviewChangesGroupViewPrototype';

export interface Prototype {
  name: string;
  description?: string;
  component: ComponentType;
}

export const prototypes: Prototype[] = [
  { name: 'Buttons', component: ButtonsPrototype },
  {
    name: 'Review changes - group view',
    component: ReviewChangesGroupViewPrototype,
  },
];
