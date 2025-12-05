import React from 'react';
import { PMPage, PMVStack, PMPageSection } from '@packmind/ui';
import { McpConfigRedesigned } from './McpConfig/McpConfigRedesigned';
import { SetupLocalEnvironment } from './SetupLocalEnvironment';
import { CliAuthentication } from './CliAuthentication';
import { AutobreadCrumb } from '../../../shared/components/navigation/AutobreadCrumb';

export function SettingsPage() {
  return (
    <PMPage
      title="Settings"
      subtitle="Manage your account settings and access tokens."
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack gap={6} width="100%" alignItems={'stretch'}>
        <PMPageSection
          title="Setup local environment"
          variant="outline"
          boxProps={{ px: 0 }}
        >
          <SetupLocalEnvironment />
        </PMPageSection>

        <PMPageSection title="CLI" variant="outline" boxProps={{ px: 0 }}>
          <CliAuthentication />
        </PMPageSection>

        <PMPageSection
          title="MCP server configuration"
          variant="outline"
          boxProps={{ px: 0 }}
        >
          <McpConfigRedesigned />
        </PMPageSection>
      </PMVStack>
    </PMPage>
  );
}
