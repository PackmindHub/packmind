import React from 'react';
import { PMPage, PMVStack } from '@packmind/ui';
import { McpConfig } from './McpConfig';
import { ApiKeyConfig } from './ApiKeyConfig';
import { AutobreadCrumb } from '../../../shared/components/navigation/AutobreadCrumb';

export function SettingsPage() {
  return (
    <PMPage
      title="Settings"
      subtitle="Manage your account settings and access tokens."
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack gap={6} width="100%" alignItems={'stretch'}>
        <ApiKeyConfig />
        <McpConfig />
      </PMVStack>
    </PMPage>
  );
}
