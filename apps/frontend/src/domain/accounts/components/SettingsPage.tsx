import React from 'react';
import { PMPage, PMVStack } from '@packmind/ui';
import { McpConfig } from './McpConfig';
import { AutobreadCrumb } from '../../../shared/components/navigation/AutobreadCrumb';

export function SettingsPage() {
  return (
    <PMPage
      title="Settings"
      subtitle="Manage your account settings and access tokens."
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack gap={6} width="100%" alignItems={'stretch'}>
        <McpConfig />
      </PMVStack>
    </PMPage>
  );
}
