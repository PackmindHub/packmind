import React from 'react';
import {
  PMHStack,
  PMVStack,
  PMText,
  PMButton,
  PMBadge,
  PMBox,
  PMTooltip,
  PMEmptyState,
} from '@packmind/ui';
import { LLMConfigurationDTO, LLM_PROVIDER_METADATA } from '@packmind/types';
import { LuPencil, LuX } from 'react-icons/lu';

export type ConfigurationStatusType =
  | 'loading'
  | 'connected'
  | 'failed'
  | 'not_configured';

interface LLMConfigurationDisplayProps {
  configuration: LLMConfigurationDTO;
  status: ConfigurationStatusType;
  errorMessage?: string;
  isEditing?: boolean;
  onEdit: () => void;
  onCancel?: () => void;
}

const StatusBadge: React.FC<{
  status: ConfigurationStatusType;
  errorMessage?: string;
}> = ({ status, errorMessage }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'connected':
        return { colorScheme: 'green', label: 'Connected' };
      case 'failed':
        return { colorScheme: 'red', label: 'Failed' };
      case 'loading':
        return { colorScheme: 'gray', label: 'Checking...' };
      default:
        return { colorScheme: 'gray', label: 'Not configured' };
    }
  };

  const { colorScheme, label } = getBadgeConfig();

  const badge = (
    <PMBadge colorPalette={colorScheme} variant="solid">
      {label}
    </PMBadge>
  );

  if (status === 'failed' && errorMessage) {
    return (
      <PMTooltip label={errorMessage} placement="top">
        {badge}
      </PMTooltip>
    );
  }

  return badge;
};

interface LLMEmptyStateProps {
  onConfigure: () => void;
}

export const LLMEmptyState: React.FC<LLMEmptyStateProps> = ({
  onConfigure,
}) => {
  return (
    <PMEmptyState
      title="No AI Provider Configured"
      description="Configure an AI provider to enable features like standards and recipes summaries generation, and linting (enterprise feature)"
    >
      <PMButton size="xl" onClick={onConfigure}>
        Configure AI Provider
      </PMButton>
    </PMEmptyState>
  );
};

export const LLMConfigurationDisplay: React.FC<
  LLMConfigurationDisplayProps
> = ({
  configuration,
  status,
  errorMessage,
  isEditing = false,
  onEdit,
  onCancel,
}) => {
  const providerMetadata = LLM_PROVIDER_METADATA[configuration.provider];
  const providerName = providerMetadata?.displayName ?? configuration.provider;

  const handleButtonClick = () => {
    if (isEditing && onCancel) {
      onCancel();
    } else {
      onEdit();
    }
  };

  return (
    <PMBox
      backgroundColor="background.primary"
      p={6}
      borderRadius="md"
      width="full"
    >
      <PMHStack
        justifyContent="space-between"
        alignItems="flex-start"
        width="full"
      >
        <PMVStack alignItems="flex-start" gap={3} width="full">
          <PMHStack gap={3} alignItems="center">
            <PMText fontWeight="semibold" fontSize="lg">
              {providerName}
            </PMText>
            <StatusBadge status={status} errorMessage={errorMessage} />
          </PMHStack>

          <PMVStack alignItems="flex-start" gap={1}>
            <PMHStack gap={2}>
              <PMText color="secondary" fontSize="sm">
                Model:
              </PMText>
              <PMText fontSize="sm">{configuration.model}</PMText>
            </PMHStack>

            {configuration.fastestModel && (
              <PMHStack gap={2}>
                <PMText color="secondary" fontSize="sm">
                  Fast model:
                </PMText>
                <PMText fontSize="sm">{configuration.fastestModel}</PMText>
              </PMHStack>
            )}
          </PMVStack>
        </PMVStack>

        <PMButton variant="secondary" size="sm" onClick={handleButtonClick}>
          {isEditing ? <LuX /> : <LuPencil />}
          {isEditing ? 'Cancel edit' : 'Edit'}
        </PMButton>
      </PMHStack>
    </PMBox>
  );
};
