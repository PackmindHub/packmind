/**
 * LLM Provider Metadata for frontend configuration forms.
 * This module exports provider information, default models, and field definitions
 * that enable dynamic form generation in the UI.
 */

/**
 * Enum for LLM service providers.
 * Centralizes provider identifiers to avoid magic strings.
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  OPENAI_COMPATIBLE = 'openai-compatible',
  AZURE_OPENAI = 'azure-openai',
  PACKMIND = 'packmind',
}

/**
 * Field input types for configuration forms
 */
export type FieldType = 'text' | 'password' | 'url';

/**
 * Configuration field definition for provider forms.
 * Each field contains all necessary information for UI rendering.
 */
export type ProviderConfigField = {
  /** Field identifier (e.g., 'apiKey', 'endpoint') */
  name: string;
  /** Display label (e.g., 'API Key', 'Endpoint URL') */
  label: string;
  /** Input type for form rendering */
  type: FieldType;
  /** Default value (empty string if none) */
  defaultValue: string;
  /** Help text shown below/beside the field */
  helpMessage: string;
  /** Whether the field can be left empty */
  optional: boolean;
  /** Optional placeholder text for input */
  placeholder?: string;
  /** Whether this field contains sensitive/secret information */
  secret?: boolean;
};

/**
 * Complete metadata for an LLM provider.
 * Contains all information needed to display and configure a provider in the UI.
 */
export type ProviderMetadata = {
  /** Provider identifier matching LLMProvider enum value */
  id: string;
  /** Human-readable provider name */
  displayName: string;
  /** Provider description for UI */
  description: string;
  /** Standard/high-quality model name */
  defaultModel: string;
  /** Fast/economical model name */
  defaultFastModel: string;
  /** All configurable fields for this provider */
  fields: ProviderConfigField[];
  /** Link to provider documentation */
  documentationUrl?: string;
};

/**
 * Default model configurations for LLM service providers.
 * These are used as fallback values when models are not explicitly specified in config.
 */
export const DEFAULT_OPENAI_MODELS = {
  model: 'gpt-5.1',
  fastestModel: 'gpt-4.1-mini',
} as const;

export const DEFAULT_ANTHROPIC_MODELS = {
  model: 'claude-sonnet-4-5-20250929',
  fastestModel: 'claude-haiku-4-5-20251001',
} as const;

export const DEFAULT_GEMINI_MODELS = {
  model: 'gemini-3-pro-preview',
  fastestModel: 'gemini-2.5-flash',
} as const;

export const DEFAULT_AZURE_OPENAI_API_VERSION = '2024-12-01-preview';

/**
 * Comprehensive metadata for all LLM providers.
 * Used by frontend to dynamically render provider configuration forms.
 */
export const LLM_PROVIDER_METADATA: Record<LLMProvider, ProviderMetadata> = {
  [LLMProvider.OPENAI]: {
    id: LLMProvider.OPENAI,
    displayName: 'OpenAI',
    description:
      'OpenAI GPT models including GPT-4 and GPT-5. Requires an API key from OpenAI.',
    defaultModel: DEFAULT_OPENAI_MODELS.model,
    defaultFastModel: DEFAULT_OPENAI_MODELS.fastestModel,
    documentationUrl: 'https://platform.openai.com/docs',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        defaultValue: '',
        helpMessage: 'Your OpenAI API key from platform.openai.com.',
        optional: false,
        placeholder: 'sk-...',
        secret: true,
      },
      {
        name: 'model',
        label: 'Model',
        type: 'text',
        defaultValue: DEFAULT_OPENAI_MODELS.model,
        helpMessage:
          'The primary model to use for standard operations. Defaults to the latest recommended model.',
        optional: false,
        placeholder: 'gpt-5.1',
        secret: false,
      },
      {
        name: 'fastestModel',
        label: 'Fast Model',
        type: 'text',
        defaultValue: DEFAULT_OPENAI_MODELS.fastestModel,
        helpMessage:
          '(Optional) A faster, more economical model for less complex operations. If not set, will use default model.',
        optional: true,
        placeholder: 'gpt-4.1-mini',
        secret: false,
      },
    ],
  },

  [LLMProvider.ANTHROPIC]: {
    id: LLMProvider.ANTHROPIC,
    displayName: 'Anthropic Claude',
    description:
      'Anthropic Claude models known for safety and helpfulness. Requires an API key from Anthropic.',
    defaultModel: DEFAULT_ANTHROPIC_MODELS.model,
    defaultFastModel: DEFAULT_ANTHROPIC_MODELS.fastestModel,
    documentationUrl: 'https://docs.anthropic.com',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        defaultValue: '',
        helpMessage: 'Your Anthropic API key from console.anthropic.com.',
        optional: false,
        placeholder: 'sk-ant-...',
        secret: true,
      },
      {
        name: 'model',
        label: 'Model',
        type: 'text',
        defaultValue: DEFAULT_ANTHROPIC_MODELS.model,
        helpMessage:
          'The primary Claude model to use. Defaults to the latest Sonnet model.',
        optional: false,
        placeholder: 'claude-sonnet-4-5-20250929',
        secret: false,
      },
      {
        name: 'fastestModel',
        label: 'Fast Model',
        type: 'text',
        defaultValue: DEFAULT_ANTHROPIC_MODELS.fastestModel,
        helpMessage:
          '(Optional) A faster, more economical model for less complex operations. If not set, will use default model.',
        optional: true,
        placeholder: 'claude-haiku-4-5-20251001',
        secret: false,
      },
    ],
  },

  [LLMProvider.GEMINI]: {
    id: LLMProvider.GEMINI,
    displayName: 'Google Gemini',
    description:
      "Google's Gemini models with multimodal capabilities. Requires an API key from Google AI Studio.",
    defaultModel: DEFAULT_GEMINI_MODELS.model,
    defaultFastModel: DEFAULT_GEMINI_MODELS.fastestModel,
    documentationUrl: 'https://ai.google.dev/docs',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        defaultValue: '',
        helpMessage: 'Your Google AI API key from aistudio.google.com.',
        optional: false,
        placeholder: 'AIza...',
        secret: true,
      },
      {
        name: 'model',
        label: 'Model',
        type: 'text',
        defaultValue: DEFAULT_GEMINI_MODELS.model,
        helpMessage:
          'The primary Gemini model to use. Defaults to the latest Pro model.',
        optional: false,
        placeholder: 'gemini-3-pro-preview',
        secret: false,
      },
      {
        name: 'fastestModel',
        label: 'Fast Model',
        type: 'text',
        defaultValue: DEFAULT_GEMINI_MODELS.fastestModel,
        helpMessage:
          '(Optional) A faster, more economical model for less complex operations. If not set, will use default model.',
        optional: true,
        placeholder: 'gemini-2.5-flash',
        secret: false,
      },
    ],
  },

  [LLMProvider.AZURE_OPENAI]: {
    id: LLMProvider.AZURE_OPENAI,
    displayName: 'Azure OpenAI',
    description:
      'Microsoft Azure-hosted OpenAI models. Requires Azure deployment names and credentials.',
    defaultModel: '',
    defaultFastModel: '',
    documentationUrl:
      'https://learn.microsoft.com/en-us/azure/ai-services/openai/',
    fields: [
      {
        name: 'endpoint',
        label: 'Endpoint URL',
        type: 'url',
        defaultValue: '',
        helpMessage: 'Your Azure OpenAI endpoint URL.',
        optional: false,
        placeholder: 'https://your-resource.openai.azure.com',
        secret: false,
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        defaultValue: '',
        helpMessage: 'Your Azure OpenAI API key.',
        optional: false,
        placeholder: '',
        secret: true,
      },
      {
        name: 'model',
        label: 'Model Deployment Name',
        type: 'text',
        defaultValue: '',
        helpMessage:
          'The Azure deployment name for the primary model. This is the name you gave your deployment in Azure Portal.',
        optional: false,
        placeholder: 'my-gpt-4-deployment',
        secret: false,
      },
      {
        name: 'fastestModel',
        label: 'Fast Model Deployment Name',
        type: 'text',
        defaultValue: '',
        helpMessage:
          '(Optional) The Azure deployment name for the fastest operation. Will use the default one is missing.',
        optional: true,
        placeholder: 'my-gpt-35-turbo-deployment',
        secret: false,
      },
      {
        name: 'apiVersion',
        label: 'API Version',
        type: 'text',
        defaultValue: DEFAULT_AZURE_OPENAI_API_VERSION,
        helpMessage:
          'The Azure OpenAI API version to use. Defaults to the latest stable version.',
        optional: true,
        placeholder: '2024-12-01-preview',
        secret: false,
      },
    ],
  },

  [LLMProvider.OPENAI_COMPATIBLE]: {
    id: LLMProvider.OPENAI_COMPATIBLE,
    displayName: 'OpenAI-Compatible',
    description:
      'Any OpenAI-compatible API endpoint. Use this for local models (Ollama, LM Studio) or other compatible providers.',
    defaultModel: '',
    defaultFastModel: '',
    documentationUrl: undefined,
    fields: [
      {
        name: 'llmEndpoint',
        label: 'Endpoint URL',
        type: 'url',
        defaultValue: '',
        helpMessage:
          'The base URL of the OpenAI-compatible API endpoint (e.g., http://localhost:11434/v1 for Ollama).',
        optional: false,
        placeholder: 'http://localhost:11434/v1',
        secret: false,
      },
      {
        name: 'llmApiKey',
        label: 'API Key',
        type: 'password',
        defaultValue: '',
        helpMessage:
          'API key for authentication. Some local providers may not require this.',
        optional: false,
        placeholder: '',
        secret: true,
      },
      {
        name: 'model',
        label: 'Model',
        type: 'text',
        defaultValue: '',
        helpMessage:
          'The model identifier to use for standard operations (e.g., llama3, mistral).',
        optional: false,
        placeholder: 'llama3',
        secret: false,
      },
      {
        name: 'fastestModel',
        label: 'Fast Model',
        type: 'text',
        defaultValue: '',
        helpMessage:
          '(Optional) A faster, more economical model for less complex operations. If not set, will use default model.',
        optional: true,
        placeholder: 'llama3',
        secret: false,
      },
    ],
  },

  [LLMProvider.PACKMIND]: {
    id: LLMProvider.PACKMIND,
    displayName: 'Packmind (SaaS)',
    description:
      'Packmind managed LLM service. Uses the platform default provider configuration.',
    defaultModel: DEFAULT_OPENAI_MODELS.model,
    defaultFastModel: DEFAULT_OPENAI_MODELS.fastestModel,
    documentationUrl: undefined,
    fields: [],
  },
};

/**
 * Helper function to get metadata for a specific provider.
 * @param provider - The LLM provider enum value
 * @returns The provider metadata or undefined if not found
 */
export function getProviderMetadata(
  provider: LLMProvider,
): ProviderMetadata | undefined {
  return LLM_PROVIDER_METADATA[provider];
}

/**
 * Get all available providers as an array.
 * Useful for rendering provider selection lists.
 */
export function getAllProviders(): ProviderMetadata[] {
  return Object.values(LLM_PROVIDER_METADATA);
}

/**
 * Get providers that are user-configurable.
 * In CLOUD deployments, includes all providers (including Packmind).
 * In non-CLOUD deployments, excludes Packmind internal provider.
 * @param deploymentEnv - The deployment environment value (e.g., 'CLOUD', 'local'). Pass null or undefined for non-cloud.
 */
export function getConfigurableProviders(
  deploymentEnv?: string | null,
): ProviderMetadata[] {
  const isCloud = deploymentEnv?.toLowerCase() === 'cloud';

  if (isCloud) {
    return Object.values(LLM_PROVIDER_METADATA);
  }

  return Object.values(LLM_PROVIDER_METADATA).filter(
    (provider) => provider.id !== LLMProvider.PACKMIND,
  );
}
