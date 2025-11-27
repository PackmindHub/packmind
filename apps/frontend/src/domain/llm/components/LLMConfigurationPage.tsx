import React, { useCallback, useMemo, useState } from 'react';
import { PMVStack, PMPageSection, PMSpinner, PMBox } from '@packmind/ui';
import {
  OrganizationId,
  LLMServiceConfig,
  TestLLMConnectionResponse,
} from '@packmind/types';
import {
  LLMConfigurationDisplay,
  LLMEmptyState,
  ConfigurationStatusType,
} from './LLMConfigurationDisplay';
import { LLMConfigurationForm } from './LLMConfigurationForm';
import {
  useTestLLMConnectionMutation,
  useGetLLMConfigurationQuery,
  useTestSavedLLMConfigurationQuery,
  useSaveLLMConfigurationMutation,
  useGetAvailableProvidersQuery,
} from '../api/queries/LLMQueries';

interface LLMConfigurationPageProps {
  organizationId: OrganizationId;
}

export const LLMConfigurationPage: React.FC<LLMConfigurationPageProps> = ({
  organizationId,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const testConnectionMutation = useTestLLMConnectionMutation(organizationId);
  const saveMutation = useSaveLLMConfigurationMutation(organizationId);

  // Fetch available providers from API
  const { data: providersData, isLoading: isLoadingProviders } =
    useGetAvailableProvidersQuery(organizationId);

  // Fetch existing configuration
  const {
    data: configurationData,
    isLoading: isLoadingConfiguration,
    refetch: refetchConfiguration,
  } = useGetLLMConfigurationQuery(organizationId);

  const hasConfiguration = configurationData?.hasConfiguration ?? false;

  // Test saved configuration (only if config exists)
  const {
    data: testSavedData,
    isLoading: isTestingSaved,
    isFetching: isRefetchingTest,
  } = useTestSavedLLMConfigurationQuery(organizationId, hasConfiguration);

  // Determine the current status
  const currentStatus: ConfigurationStatusType = useMemo(() => {
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
      // Refetch configuration after save to update the display
      await refetchConfiguration();
    },
    [saveMutation, refetchConfiguration],
  );

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSaveSuccess = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleConfigure = useCallback(() => {
    setIsEditing(true);
  }, []);

  if (isLoadingConfiguration || isLoadingProviders) {
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

  const providers = providersData?.providers ?? [];

  return (
    <PMVStack gap={6} alignItems="stretch" width="full">
      <PMPageSection variant="outline">
        {!hasConfiguration && !isEditing && (
          <LLMEmptyState onConfigure={handleConfigure} />
        )}

        {hasConfiguration && configurationData?.configuration && (
          <PMVStack gap={4} alignItems="stretch" width="full">
            <LLMConfigurationDisplay
              configuration={configurationData.configuration}
              status={currentStatus}
              errorMessage={errorMessage}
              isEditing={isEditing}
              onEdit={handleEdit}
              onCancel={handleCancel}
            />

            {isEditing && (
              <PMBox pt={4} borderTopWidth="1px">
                <LLMConfigurationForm
                  organizationId={organizationId}
                  onTestConnection={handleTestConnection}
                  onSaveConfiguration={handleSaveConfiguration}
                  isSaving={saveMutation.isPending}
                  existingConfiguration={configurationData.configuration}
                  providers={providers}
                  onSaveSuccess={handleSaveSuccess}
                />
              </PMBox>
            )}
          </PMVStack>
        )}

        {!hasConfiguration && isEditing && (
          <LLMConfigurationForm
            organizationId={organizationId}
            onTestConnection={handleTestConnection}
            onSaveConfiguration={handleSaveConfiguration}
            isSaving={saveMutation.isPending}
            existingConfiguration={null}
            providers={providers}
            onCancel={handleCancel}
            onSaveSuccess={handleSaveSuccess}
          />
        )}
      </PMPageSection>
    </PMVStack>
  );
};
