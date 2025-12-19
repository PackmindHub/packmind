import React from 'react';
import { PMBox, PMPage } from '@packmind/ui';
import { LocalEnvironmentSetup } from './LocalEnvironmentSetup';
import { AutobreadCrumb } from '../../../shared/components/navigation/AutobreadCrumb';

export function SettingsPage() {
  return (
    <PMPage
      title="Settings"
      subtitle="Manage your account settings and access tokens."
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMBox background={'background.primary'} p={4}>
        <LocalEnvironmentSetup />
      </PMBox>
    </PMPage>
  );
}
