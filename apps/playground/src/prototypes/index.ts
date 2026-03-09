import { ComponentType } from 'react';
import ButtonsPrototype from './ButtonsPrototype';

export interface Prototype {
  name: string;
  description?: string;
  component: ComponentType;
}

export const prototypes: Prototype[] = [
  { name: 'Buttons', component: ButtonsPrototype },
];
