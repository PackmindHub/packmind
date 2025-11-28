import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  PMBox,
  PMVStack,
  PMHStack,
  PMButton,
  PMInput,
  PMField,
  PMNativeSelect,
  PMText,
  PMAlert,
  PMLink,
  PMAlertDialog,
  PMTooltip,
  pmToaster,
} from '@packmind/ui';
import {
  LLMProvider,
  LLMServiceConfig,
  TestLLMConnectionResponse,
  ProviderConfigField,
  LLMConfigurationDTO,
  ProviderMetadata,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';

interface LLMConfigurationFormProps {
  organizationId: OrganizationId;
  onTestConnection: (
    config: LLMServiceConfig,
  ) => Promise<TestLLMConnectionResponse>;
  onSaveConfiguration: (config: LLMServiceConfig) => Promise<void>;
  isSaving?: boolean;
  existingConfiguration?: LLMConfigurationDTO | null;
  providers: ProviderMetadata[];
  onCancel?: () => void;
  onSaveSuccess?: () => void;
}

type FormValues = Record<string, string>;
type FormErrors = Record<string, string>;

/**
 * Returns the error message directly - backend now extracts user-friendly messages.
 */
const extractReadableErrorMessage = (
  errorMessage: string | undefined,
): string => {
  return errorMessage || 'An unknown error occurred';
};

interface TestConnectionState {
  isLoading: boolean;
  result: TestLLMConnectionResponse | null;
  error: string | null;
}

export const LLMConfigurationForm: React.FC<LLMConfigurationFormProps> = ({
  onTestConnection,
  onSaveConfiguration,
  isSaving = false,
  existingConfiguration,
  providers,
  onCancel,
  onSaveSuccess,
}) => {
  const providerItems = useMemo(
    () =>
      providers
        .map((provider) => ({
          label: provider.displayName,
          value: provider.id,
          disabled: false,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [providers],
  );

  // Helper to find provider metadata by ID
  const findProviderMetadata = useCallback(
    (providerId: string): ProviderMetadata | null => {
      return providers.find((p) => p.id === providerId) || null;
    },
    [providers],
  );

  // Get the default provider from the providers list
  const defaultProvider = useMemo(() => {
    if (existingConfiguration?.provider) {
      return existingConfiguration.provider;
    }
    return providers.length > 0 ? (providers[0].id as LLMProvider) : '';
  }, [existingConfiguration, providers]);

  const [selectedProvider, setSelectedProvider] =
    useState<string>(defaultProvider);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [testConnection, setTestConnection] = useState<TestConnectionState>({
    isLoading: false,
    result: null,
    error: null,
  });
  const [isOverwriteDialogOpen, setIsOverwriteDialogOpen] = useState(false);

  // Initialize form values from existing configuration
  useEffect(() => {
    if (existingConfiguration) {
      setSelectedProvider(existingConfiguration.provider);

      // Initialize form values with existing configuration data
      const metadata = findProviderMetadata(existingConfiguration.provider);
      if (metadata) {
        const initialValues: FormValues = {};
        metadata.fields.forEach((field) => {
          // Use existing config values where available, otherwise use defaults
          if (field.name === 'model' && existingConfiguration.model) {
            initialValues[field.name] = existingConfiguration.model;
          } else if (
            field.name === 'fastestModel' &&
            existingConfiguration.fastestModel
          ) {
            initialValues[field.name] = existingConfiguration.fastestModel;
          } else if (
            field.name === 'endpoint' &&
            existingConfiguration.endpoint
          ) {
            initialValues[field.name] = existingConfiguration.endpoint;
          } else if (
            field.name === 'apiVersion' &&
            existingConfiguration.apiVersion
          ) {
            initialValues[field.name] = existingConfiguration.apiVersion;
          } else {
            initialValues[field.name] = field.defaultValue;
          }
        });
        setFormValues(initialValues);
      }
    }
  }, [existingConfiguration, findProviderMetadata]);

  const selectedProviderMetadata = useMemo(() => {
    if (!selectedProvider) return null;
    return findProviderMetadata(selectedProvider);
  }, [selectedProvider, findProviderMetadata]);

  const handleProviderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newProvider = e.target.value;
      setSelectedProvider(newProvider);
      setErrors({});
      setTestConnection({ isLoading: false, result: null, error: null });

      // Initialize form values with defaults for the new provider
      if (newProvider) {
        const metadata = findProviderMetadata(newProvider);
        if (metadata) {
          const initialValues: FormValues = {};
          metadata.fields.forEach((field) => {
            initialValues[field.name] = field.defaultValue;
          });
          setFormValues(initialValues);
        }
      } else {
        setFormValues({});
      }
    },
    [findProviderMetadata],
  );

  const handleFieldChange = useCallback(
    (fieldName: string, value: string) => {
      setFormValues((prev) => ({
        ...prev,
        [fieldName]: value,
      }));
      // Clear error when user starts typing
      if (errors[fieldName]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    },
    [errors],
  );

  const validateForm = useCallback((): boolean => {
    if (!selectedProviderMetadata) {
      return false;
    }

    const newErrors: FormErrors = {};

    selectedProviderMetadata.fields.forEach((field) => {
      if (!field.optional) {
        const value = formValues[field.name]?.trim() || '';
        if (!value) {
          newErrors[field.name] = `${field.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedProviderMetadata, formValues]);

  const buildConfig = useCallback((): LLMServiceConfig | null => {
    if (!selectedProvider || !selectedProviderMetadata) return null;

    const fieldValues: Record<string, string> = {};

    for (const field of selectedProviderMetadata.fields) {
      const value = formValues[field.name]?.trim();
      if (value) {
        fieldValues[field.name] = value;
      } else if (!field.optional) {
        fieldValues[field.name] = '';
      }
    }

    return {
      provider: selectedProvider as LLMProvider,
      ...fieldValues,
    } as LLMServiceConfig;
  }, [selectedProvider, selectedProviderMetadata, formValues]);

  const handleTestConnection = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    const config = buildConfig();
    if (!config) {
      return;
    }

    setTestConnection({ isLoading: true, result: null, error: null });

    try {
      const result = await onTestConnection(config);
      setTestConnection({ isLoading: false, result, error: null });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Connection test failed';
      setTestConnection({
        isLoading: false,
        result: null,
        error: errorMessage,
      });
    }
  }, [validateForm, buildConfig, onTestConnection]);

  const handleSaveConfiguration = useCallback(async () => {
    const config = buildConfig();
    if (!config) {
      return;
    }

    try {
      await onSaveConfiguration(config);
      pmToaster.create({
        type: 'success',
        title: 'Configuration Saved',
        description: 'Your LLM provider configuration has been saved.',
      });
      onSaveSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save configuration';
      pmToaster.create({
        type: 'error',
        title: 'Save Failed',
        description: errorMessage,
      });
    }
  }, [buildConfig, onSaveConfiguration, onSaveSuccess]);

  const handleSaveClick = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    // If there's an existing configuration, show confirmation dialog
    if (existingConfiguration) {
      setIsOverwriteDialogOpen(true);
    } else {
      handleSaveConfiguration();
    }
  }, [validateForm, existingConfiguration, handleSaveConfiguration]);

  const handleConfirmOverwrite = useCallback(() => {
    setIsOverwriteDialogOpen(false);
    handleSaveConfiguration();
  }, [handleSaveConfiguration]);

  const renderField = useCallback(
    (field: ProviderConfigField) => {
      const hasError = !!errors[field.name];
      const inputType = field.secret ? 'password' : 'text';

      return (
        <PMField.Root
          key={field.name}
          required={!field.optional}
          invalid={hasError}
        >
          <PMField.Label>
            {field.label}
            {!field.optional && <PMField.RequiredIndicator />}
          </PMField.Label>
          <PMInput
            type={inputType}
            value={formValues[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            error={errors[field.name]}
          />
          {field.helpMessage && (
            <PMField.HelperText>{field.helpMessage}</PMField.HelperText>
          )}
          {hasError && (
            <PMField.ErrorText>{errors[field.name]}</PMField.ErrorText>
          )}
        </PMField.Root>
      );
    },
    [formValues, errors, handleFieldChange],
  );

  const renderTestConnectionResult = () => {
    if (testConnection.error) {
      return (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>Connection Test Failed</PMAlert.Title>
          <PMAlert.Description>{testConnection.error}</PMAlert.Description>
        </PMAlert.Root>
      );
    }

    if (!testConnection.result) {
      return null;
    }

    const { result } = testConnection;

    if (result.overallSuccess) {
      return (
        <PMAlert.Root status="success">
          <PMAlert.Indicator />
          <PMAlert.Title>Connection Successful</PMAlert.Title>
          <PMAlert.Description>
            Successfully connected to {selectedProviderMetadata?.displayName}.
            {result.standardModel.success && (
              <PMText as="span">
                {' '}
                Standard model ({result.standardModel.model}) is working.
              </PMText>
            )}
            {result.fastModel?.success && (
              <PMText as="span">
                {' '}
                Fast model ({result.fastModel.model}) is working.
              </PMText>
            )}
          </PMAlert.Description>
        </PMAlert.Root>
      );
    }

    // Partial failure
    return (
      <PMAlert.Root status="warning">
        <PMAlert.Indicator />
        <PMAlert.Title>Partial Connection Issues</PMAlert.Title>
        <PMAlert.Description>
          <PMVStack gap={2} alignItems="flex-start">
            {!result.standardModel.success && (
              <PMText>
                Standard model ({result.standardModel.model}) failed:{' '}
                {extractReadableErrorMessage(
                  result.standardModel.error?.message,
                )}
              </PMText>
            )}
            {result.fastModel && !result.fastModel.success && (
              <PMText>
                Fast model ({result.fastModel.model}) failed:{' '}
                {extractReadableErrorMessage(result.fastModel.error?.message)}
              </PMText>
            )}
          </PMVStack>
        </PMAlert.Description>
      </PMAlert.Root>
    );
  };

  return (
    <PMBox
      width="full"
      backgroundColor="background.primary"
      p={6}
      borderRadius="md"
    >
      <PMVStack gap={6} alignItems="stretch">
        <PMField.Root required>
          <PMField.Label>
            AI Provider
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PMNativeSelect
            items={providerItems}
            value={selectedProvider}
            onChange={handleProviderChange}
            data-testid="provider-select"
          />
          <PMField.HelperText>
            Select the AI provider you want to configure
          </PMField.HelperText>
        </PMField.Root>

        {selectedProviderMetadata && (
          <>
            {selectedProviderMetadata.description && (
              <PMText color="secondary">
                {selectedProviderMetadata.description}
              </PMText>
            )}

            {selectedProviderMetadata.fields.length > 0 && (
              <PMVStack gap={4} alignItems="stretch">
                {selectedProviderMetadata.fields.map(renderField)}
              </PMVStack>
            )}

            {selectedProviderMetadata.fields.length === 0 && (
              <PMAlert.Root status="info">
                <PMAlert.Indicator />
                <PMAlert.Description>
                  This provider does not require any configuration.
                </PMAlert.Description>
              </PMAlert.Root>
            )}

            {renderTestConnectionResult()}

            <PMHStack gap={4}>
              {onCancel && (
                <PMButton
                  variant="ghost"
                  onClick={onCancel}
                  disabled={isSaving}
                >
                  Cancel
                </PMButton>
              )}
              <PMButton
                onClick={handleTestConnection}
                disabled={
                  testConnection.isLoading || !selectedProvider || isSaving
                }
                variant="secondary"
                data-testid="test-connection-button"
              >
                {testConnection.isLoading ? 'Testing...' : 'Test Connection'}
              </PMButton>
              <PMTooltip
                label="Test connection before saving"
                disabled={testConnection.result?.overallSuccess}
              >
                <span>
                  <PMAlertDialog
                    trigger={
                      <PMButton
                        onClick={handleSaveClick}
                        disabled={
                          testConnection.isLoading ||
                          !selectedProvider ||
                          isSaving ||
                          !testConnection.result?.overallSuccess
                        }
                        data-testid="save-configuration-button"
                      >
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                      </PMButton>
                    }
                    title="Overwrite Configuration"
                    message="An existing LLM configuration will be overwritten. Are you sure you want to continue?"
                    confirmText="Overwrite"
                    cancelText="Cancel"
                    confirmColorScheme="red"
                    onConfirm={handleConfirmOverwrite}
                    open={isOverwriteDialogOpen}
                    onOpenChange={({ open }) => setIsOverwriteDialogOpen(open)}
                    isLoading={isSaving}
                  />
                </span>
              </PMTooltip>
            </PMHStack>

            {selectedProviderMetadata.documentationUrl && (
              <PMText variant="small" color="secondary">
                Need help? Check the{' '}
                <PMLink
                  href={selectedProviderMetadata.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="underline"
                >
                  provider documentation
                </PMLink>
              </PMText>
            )}
          </>
        )}
      </PMVStack>
    </PMBox>
  );
};
