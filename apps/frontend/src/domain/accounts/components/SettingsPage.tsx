import React from 'react';
import {
  PMPage,
  PMVStack,
  PMPageSection,
  PMFeatureFlag,
  CLI_LOGIN_COMMAND_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
} from '@packmind/ui';
import { McpConfigRedesigned } from './McpConfig/McpConfigRedesigned';
import { SetupLocalEnvironment } from './SetupLocalEnvironment';
import { CliAuthentication } from './CliAuthentication';
import { AutobreadCrumb } from '../../../shared/components/navigation/AutobreadCrumb';
import { useAuthContext } from '../hooks/useAuthContext';

export function SettingsPage() {
  const { user } = useAuthContext();

  return (
    <PMPage
      title="Settings"
      subtitle="Manage your account settings and access tokens."
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack gap={6} width="100%" alignItems={'stretch'}>
        <PMFeatureFlag
          featureKeys={[CLI_LOGIN_COMMAND_FEATURE_KEY]}
          featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
          userEmail={user?.email}
        >
          <PMPageSection
            title="Setup local environment"
            variant="outline"
            boxProps={{ px: 0 }}
          >
            <SetupLocalEnvironment />
          </PMPageSection>
        </PMFeatureFlag>

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
