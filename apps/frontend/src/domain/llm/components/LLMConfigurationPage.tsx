import React, { useCallback, useMemo } from 'react';
import { PMVStack, PMPageSection, PMSpinner, PMBox } from '@packmind/ui';
import {
  OrganizationId,
  LLMServiceConfig,
  TestLLMConnectionResponse,
  LLM_PROVIDER_METADATA,
} from '@packmind/types';
import {
  LLMConfigurationStatus,
  LLMConfigurationStatusType,
} from './LLMConfigurationStatus';
import { LLMConfigurationForm } from './LLMConfigurationForm';
import {
  useTestLLMConnectionMutation,
  useGetLLMConfigurationQuery,
  useTestSavedLLMConfigurationQuery,
  useSaveLLMConfigurationMutation,
} from '../api/queries/LLMQueries';

interface LLMConfigurationPageProps {
  organizationId: OrganizationId;
  deploymentEnv?: string;
}

export const LLMConfigurationPage: React.FC<LLMConfigurationPageProps> = ({
  organizationId,
  deploymentEnv,
}) => {
  const testConnectionMutation = useTestLLMConnectionMutation(organizationId);
  const saveMutation = useSaveLLMConfigurationMutation(organizationId);

  // Fetch existing configuration
  const { data: configurationData, isLoading: isLoadingConfiguration } =
    useGetLLMConfigurationQuery(organizationId);

  const hasConfiguration = configurationData?.hasConfiguration ?? false;

  // Test saved configuration (only if config exists)
  const {
    data: testSavedData,
    isLoading: isTestingSaved,
    refetch: refetchTestSaved,
    isFetching: isRefetchingTest,
  } = useTestSavedLLMConfigurationQuery(organizationId, hasConfiguration);

  // Determine the current status
  const currentStatus: LLMConfigurationStatusType = useMemo(() => {
    if (isLoadingConfiguration) {
      return 'loading';
    }

    if (!hasConfiguration) {
      return 'not_configured';
    }

    if (isTestingSaved || isRefetchingTest) {
      return 'loading';
    }

    if (testSavedData?.overallSuccess) {
      return 'connected';
    }

    if (testSavedData && !testSavedData.overallSuccess) {
      return 'failed';
    }

    // Default to loading while we wait for test results
    return 'loading';
  }, [
    isLoadingConfiguration,
    hasConfiguration,
    isTestingSaved,
    isRefetchingTest,
    testSavedData,
  ]);

  // Get provider display name and model info
  const providerName = useMemo(() => {
    if (!configurationData?.configuration?.provider) return undefined;
    const metadata =
      LLM_PROVIDER_METADATA[configurationData.configuration.provider];
    return metadata?.displayName;
  }, [configurationData?.configuration?.provider]);

  const model = configurationData?.configuration?.model;

  // Build error message from test results
  const errorMessage = useMemo(() => {
    if (!testSavedData || testSavedData.overallSuccess) return undefined;

    const errors: string[] = [];

    if (!testSavedData.standardModel?.success) {
      errors.push(
        testSavedData.standardModel?.error?.message ||
          'Standard model connection failed',
      );
    }

    if (testSavedData.fastModel && !testSavedData.fastModel.success) {
      errors.push(
        testSavedData.fastModel.error?.message ||
          'Fast model connection failed',
      );
    }

    return errors.join('. ');
  }, [testSavedData]);

  const handleTestConnection = useCallback(
    async (config: LLMServiceConfig): Promise<TestLLMConnectionResponse> => {
      return testConnectionMutation.mutateAsync({ config });
    },
    [testConnectionMutation],
  );

  const handleSaveConfiguration = useCallback(
    async (config: LLMServiceConfig): Promise<void> => {
      await saveMutation.mutateAsync({ config });
    },
    [saveMutation],
  );

  const handleTestAgain = useCallback(() => {
    refetchTestSaved();
  }, [refetchTestSaved]);

  if (isLoadingConfiguration) {
    return (
      <PMBox
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <PMSpinner size="lg" />
      </PMBox>
    );
  }

  return (
    <PMVStack gap={6} alignItems="stretch" width="full">
      <PMPageSection title="Connection Status" variant="outline">
        <LLMConfigurationStatus
          status={currentStatus}
          providerName={providerName}
          model={model}
          errorMessage={errorMessage}
          onTestAgain={hasConfiguration ? handleTestAgain : undefined}
          isTestingAgain={isRefetchingTest}
        />
      </PMPageSection>

      <PMPageSection title="Provider Configuration" variant="outline">
        <LLMConfigurationForm
          organizationId={organizationId}
          onTestConnection={handleTestConnection}
          onSaveConfiguration={handleSaveConfiguration}
          isSaving={saveMutation.isPending}
          existingConfiguration={configurationData?.configuration}
          deploymentEnv={deploymentEnv}
        />
      </PMPageSection>
    </PMVStack>
  );
};
