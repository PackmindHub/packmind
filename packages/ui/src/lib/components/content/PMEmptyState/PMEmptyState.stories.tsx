import { PMEmptyState } from './PMEmptyState';
import { PMButton } from '../../form/PMButton/PMButton';

export default {
  title: 'Content/PMEmptyState',
  component: PMEmptyState,
  parameters: {
    layout: 'centered',
  },
};

export const Default = () => (
  <PMEmptyState
    title="Aucun résultat"
    description="Essayez de modifier vos filtres ou d'ajouter un nouvel élément."
  />
);

export const OnlyTitle = () => (
  <PMEmptyState title="Aucune donnée disponible" />
);

export const WithChildren = () => (
  <PMEmptyState
    title="Liste vide"
    description="Ajoutez un élément pour commencer !"
  >
    <PMButton>Ajouter</PMButton>
  </PMEmptyState>
);
