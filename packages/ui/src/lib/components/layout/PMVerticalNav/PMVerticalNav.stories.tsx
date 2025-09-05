import React from 'react';
import { PMVerticalNav } from './PMVerticalNav';
import { PMLink } from '../../typography/PMLink';

export default {
  title: 'Layout/PMVerticalNav',
  component: PMVerticalNav,
};

export const Default = () => (
  <PMVerticalNav>
    <PMLink>Accueil</PMLink>
    <PMLink>Recettes</PMLink>
    <PMLink>Standards</PMLink>
    <PMLink>Déploiements</PMLink>
    <PMLink>Paramètres</PMLink>
  </PMVerticalNav>
);
