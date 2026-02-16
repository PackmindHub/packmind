import React from 'react';
import { PMBox, PMPage } from '@packmind/ui';
import { LocalEnvironmentSetup } from './LocalEnvironmentSetup';

export function SettingsPage() {
  return (
    <PMPage
      title="Settings"
      subtitle="Manage your account settings and access tokens."
    >
      <PMBox background={'background.primary'} p={4}>
        <LocalEnvironmentSetup />
      </PMBox>
    </PMPage>
  );
}
