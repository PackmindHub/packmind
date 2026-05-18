import React from 'react';
import { PMPage } from '@packmind/ui';
import { AutomateUpdatesStep } from './AutomateUpdatesStep';

export const SetupAutoUpdatePage: React.FC = () => (
  <PMPage
    title="Auto-update artifacts"
    subtitle="Schedule `packmind-cli install` on your CI to keep your team's playbook in sync without thinking about it."
  >
    <AutomateUpdatesStep />
  </PMPage>
);
