import React, { useCallback } from 'react';
import { PMVStack, PMPageSection } from '@packmind/ui';
import {
  OrganizationId,
  LLMServiceConfig,
  TestLLMConnectionResponse,
} from '@packmind/types';
import {
  LLMConfigurationStatus,
  LLMConfigurationStatusType,
} from './LLMConfigurationStatus';
import { LLMConfigurationForm } from './LLMConfigurationForm';
import { useTestLLMConnectionMutation } from '../api/queries/LLMQueries';

interface LLMConfigurationPageProps {
  organizationId: OrganizationId;
  deploymentEnv?: string;
}

export const LLMConfigurationPage: React.FC<LLMConfigurationPageProps> = ({
  organizationId,
  deploymentEnv,
}) => {
  const testConnectionMutation = useTestLLMConnectionMutation(organizationId);

  // For now, we show 'not_configured' status until backend provides configuration endpoint
  const currentStatus: LLMConfigurationStatusType = 'not_configured';

  const handleTestConnection = useCallback(
    async (config: LLMServiceConfig): Promise<TestLLMConnectionResponse> => {
      return testConnectionMutation.mutateAsync({ config });
    },
    [testConnectionMutation],
  );

  return (
    <PMVStack gap={6} alignItems="stretch" width="full">
      <PMPageSection title="Connection Status" variant="outline">
        <LLMConfigurationStatus status={currentStatus} />
      </PMPageSection>

      <PMPageSection title="Provider Configuration" variant="outline">
        <LLMConfigurationForm
          organizationId={organizationId}
          onTestConnection={handleTestConnection}
          deploymentEnv={deploymentEnv}
        />
      </PMPageSection>
    </PMVStack>
  );
};
