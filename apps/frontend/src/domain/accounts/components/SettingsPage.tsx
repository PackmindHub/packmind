import React from 'react';
import {
  PMPage,
  PMVStack,
  PMPageSection,
  PMHeading,
  PMBox,
  PMSeparator,
} from '@packmind/ui';
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
      <PMPageSection
        title="Setup local environment"
        variant="outline"
        backgroundColor="primary"
      >
        <SetupLocalEnvironment />
      </PMPageSection>

      <PMVStack width="100%" alignItems={'stretch'} gap={4} marginTop={8}>
        <PMHeading level="h3">Manual configuration</PMHeading>

        <PMPageSection
          title="CLI"
          variant="outline"
          backgroundColor="primary"
          headingLevel="h4"
          collapsible={true}
        >
          <PMBox paddingY={2}>
            <CliAuthentication />
          </PMBox>
        </PMPageSection>

        <PMPageSection
          title="MCP server configuration"
          variant="outline"
          backgroundColor="primary"
          headingLevel="h4"
          collapsible={true}
        >
          <PMBox paddingY={2}>
            <McpConfigRedesigned />
          </PMBox>
        </PMPageSection>
      </PMVStack>
    </PMPage>
  );
}
