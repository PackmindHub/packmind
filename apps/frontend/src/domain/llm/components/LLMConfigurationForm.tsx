import React, { useState, useMemo, useCallback } from 'react';
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
  PMTooltip,
  PMLink,
} from '@packmind/ui';
import {
  LLM_PROVIDER_METADATA,
  getConfigurableProviders,
  LLMProvider,
  LLMServiceConfig,
  TestLLMConnectionResponse,
  ProviderConfigField,
  getAllProviders,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';

interface LLMConfigurationFormProps {
  organizationId: OrganizationId;
  onTestConnection: (
    config: LLMServiceConfig,
  ) => Promise<TestLLMConnectionResponse>;
  deploymentEnv?: string;
}

type FormValues = Record<string, string>;
type FormErrors = Record<string, string>;

/**
 * Extracts a user-friendly error message from potentially verbose API error responses.
 * Handles JSON error responses and nested error structures.
 */
const extractReadableErrorMessage = (
  errorMessage: string | undefined,
): string => {
  if (!errorMessage) {
    return 'An unknown error occurred';
  }

  // Try to find and parse JSON in the error message
  const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Handle nested error structures (e.g., Google API errors)
      if (parsed.error?.message) {
        return parsed.error.message;
      }
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      // JSON parsing failed, continue with other extraction methods
    }
  }

  return 'An error occurred.';
};

interface TestConnectionState {
  isLoading: boolean;
  result: TestLLMConnectionResponse | null;
  error: string | null;
}

export const LLMConfigurationForm: React.FC<LLMConfigurationFormProps> = ({
  onTestConnection,
}) => {
  const providerItems = useMemo(
    () =>
      getAllProviders().map((provider) => ({
        label: provider.displayName,
        value: provider.id,
        disabled: false,
      })),
    [],
  );

  const [selectedProvider, setSelectedProvider] = useState<string>(
    LLMProvider.PACKMIND,
  );
  const [formValues, setFormValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [testConnection, setTestConnection] = useState<TestConnectionState>({
    isLoading: false,
    result: null,
    error: null,
  });

  const selectedProviderMetadata = useMemo(() => {
    if (!selectedProvider) return null;
    return LLM_PROVIDER_METADATA[selectedProvider as LLMProvider] || null;
  }, [selectedProvider]);

  const handleProviderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newProvider = e.target.value;
      setSelectedProvider(newProvider);
      setErrors({});
      setTestConnection({ isLoading: false, result: null, error: null });

      // Initialize form values with defaults for the new provider
      if (newProvider) {
        const metadata = LLM_PROVIDER_METADATA[newProvider as LLMProvider];
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
    [],
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
    <PMBox width="full">
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
              <PMButton
                onClick={handleTestConnection}
                disabled={testConnection.isLoading || !selectedProvider}
                variant="outline"
                data-testid="test-connection-button"
              >
                {testConnection.isLoading ? 'Testing...' : 'Test Connection'}
              </PMButton>
              <PMTooltip label="Backend not ready - Save functionality coming soon">
                <PMButton disabled data-testid="save-configuration-button">
                  Save Configuration
                </PMButton>
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
