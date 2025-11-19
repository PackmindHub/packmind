import { useEffect, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMField,
  PMHeading,
  PMHStack,
  PMInput,
  PMText,
  PMVStack,
  PMCheckbox,
  PMConfirmationModal,
} from '@packmind/ui';
import {
  useGetRagLabConfigurationQuery,
  useUpdateRagLabConfigurationMutation,
  useTriggerFullReembeddingMutation,
} from '../../api/queries/LearningsQueries';

export function RagLabEmbeddingConfig() {
  const { data: config, isLoading } = useGetRagLabConfigurationQuery();
  const updateMutation = useUpdateRagLabConfigurationMutation();
  const reembedMutation = useTriggerFullReembeddingMutation();

  const [embeddingModel, setEmbeddingModel] = useState('');
  const [embeddingDimensions, setEmbeddingDimensions] = useState(1536);
  const [includeCodeBlocks, setIncludeCodeBlocks] = useState(true);
  const [maxTextLength, setMaxTextLength] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Update form when config loads
  useEffect(() => {
    if (config?.configuration) {
      setEmbeddingModel(config.configuration.embeddingModel);
      setEmbeddingDimensions(config.configuration.embeddingDimensions);
      setIncludeCodeBlocks(config.configuration.includeCodeBlocks);
      setMaxTextLength(config.configuration.maxTextLength);
      setHasChanges(false);
    }
  }, [config]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        embeddingModel,
        embeddingDimensions,
        includeCodeBlocks,
        maxTextLength,
      },
      {
        onSuccess: () => {
          setHasChanges(false);
        },
      },
    );
  };

  const handleReembed = () => {
    reembedMutation.mutate();
  };

  const handleChange = () => {
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <PMBox p={6} borderWidth="1px" borderRadius="md">
        <PMText>Loading configuration...</PMText>
      </PMBox>
    );
  }

  const isDefaultConfig = !config?.configuration;

  return (
    <PMBox p={6} borderWidth="1px" borderRadius="md">
      <PMVStack align="stretch" gap={4}>
        <PMVStack align="stretch" gap={1}>
          <PMHeading size="md">Embedding Configuration</PMHeading>
          <PMText>
            Configure the embedding model and parameters used for semantic
            search
          </PMText>
        </PMVStack>

        {isDefaultConfig && (
          <PMBox
            p={3}
            bg="blue.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="blue.200"
          >
            <PMText fontSize="sm">
              Currently using default settings. Customize below to optimize for
              your use case.
            </PMText>
          </PMBox>
        )}

        <PMVStack align="stretch" gap={4}>
          <PMField.Root>
            <PMField.Label>Embedding Model</PMField.Label>
            <PMInput
              value={embeddingModel}
              onChange={(e) => {
                setEmbeddingModel(e.target.value);
                handleChange();
              }}
              placeholder="text-embedding-3-small"
            />
            <PMText fontSize="sm" mt={1}>
              OpenAI embedding model to use (e.g., text-embedding-3-small,
              text-embedding-3-large)
            </PMText>
          </PMField.Root>

          <PMField.Root>
            <PMField.Label>Embedding Dimensions</PMField.Label>
            <PMInput
              type="number"
              value={embeddingDimensions}
              onChange={(e) => {
                setEmbeddingDimensions(Number(e.target.value));
                handleChange();
              }}
              min={256}
              max={3072}
              step={64}
            />
            <PMText fontSize="sm" mt={1}>
              Number of dimensions for the embedding vector (256-3072)
            </PMText>
          </PMField.Root>

          <PMField.Root>
            <PMCheckbox
              checked={includeCodeBlocks}
              onChange={() => {
                setIncludeCodeBlocks(!includeCodeBlocks);
                handleChange();
              }}
            >
              Include code blocks in embeddings
            </PMCheckbox>
            <PMText fontSize="sm" mt={1}>
              When enabled, code examples will be included in the text used to
              generate embeddings
            </PMText>
          </PMField.Root>

          <PMField.Root>
            <PMField.Label>Maximum Text Length (optional)</PMField.Label>
            <PMInput
              type="number"
              value={maxTextLength ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setMaxTextLength(value ? Number(value) : null);
                handleChange();
              }}
              min={100}
              max={50000}
              step={100}
              placeholder="No limit"
            />
            <PMText fontSize="sm" mt={1}>
              Maximum length of text to use for embeddings (leave empty for no
              limit)
            </PMText>
          </PMField.Root>
        </PMVStack>

        <PMHStack justify="space-between">
          <PMButton
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            loading={updateMutation.isPending}
            colorScheme="blue"
          >
            Save Configuration
          </PMButton>

          <PMConfirmationModal
            trigger={
              <PMButton
                disabled={reembedMutation.isPending || isDefaultConfig}
                loading={reembedMutation.isPending}
                variant="outline"
                colorScheme="orange"
              >
                Re-embed All Artifacts
              </PMButton>
            }
            title="Re-embed All Artifacts"
            message="This will re-embed all artifacts in your organization. This may take a while. Continue?"
            confirmText="Re-embed"
            confirmColorScheme="orange"
            onConfirm={handleReembed}
            isLoading={reembedMutation.isPending}
          />
        </PMHStack>

        {updateMutation.isSuccess && (
          <PMBox
            p={3}
            bg="green.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="green.200"
          >
            <PMText fontSize="sm">Configuration saved successfully!</PMText>
          </PMBox>
        )}

        {reembedMutation.isSuccess && reembedMutation.data && (
          <PMBox
            p={3}
            bg="green.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="green.200"
          >
            <PMText fontSize="sm">
              Re-embedding started! {reembedMutation.data.totalQueued} artifacts
              queued for processing.
            </PMText>
          </PMBox>
        )}
      </PMVStack>
    </PMBox>
  );
}
