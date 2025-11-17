import {
  PMBox,
  PMButton,
  PMHeading,
  PMHStack,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  useEmbeddingHealthQuery,
  useTriggerEmbeddingBackfillMutation,
} from '../../api/queries/LearningsQueries';

export function RagLabEmbeddingHealth() {
  const { data: health, isLoading } = useEmbeddingHealthQuery();
  const backfillMutation = useTriggerEmbeddingBackfillMutation();

  const handleBackfill = () => {
    backfillMutation.mutate();
  };

  if (isLoading) {
    return (
      <PMBox p={6} borderWidth="1px" borderRadius="md">
        <PMText>Loading embedding health...</PMText>
      </PMBox>
    );
  }

  if (!health) {
    return null;
  }

  const needsBackfill = health.coveragePercent < 100;

  return (
    <PMBox p={6} borderWidth="1px" borderRadius="md">
      <PMVStack align="stretch" gap={4}>
        <PMHStack justify="space-between" align="start">
          <PMVStack align="stretch" gap={1}>
            <PMHeading size="md">Embedding Coverage</PMHeading>
            <PMText>
              Tracks how many standards and recipes have semantic embeddings
              generated
            </PMText>
          </PMVStack>
          {needsBackfill && (
            <PMButton
              onClick={handleBackfill}
              disabled={backfillMutation.isPending}
              loading={backfillMutation.isPending}
              colorScheme="blue"
              size="sm"
            >
              Generate Missing
            </PMButton>
          )}
        </PMHStack>

        <PMVStack align="stretch" gap={3}>
          <PMBox>
            <PMHStack justify="space-between" mb={2}>
              <PMText fontWeight="medium">Overall Coverage</PMText>
              <PMText fontWeight="bold">
                {health.coveragePercent.toFixed(1)}%
              </PMText>
            </PMHStack>
          </PMBox>

          <PMHStack gap={6}>
            <PMVStack align="stretch" gap={1} flex={1}>
              <PMText fontSize="sm" fontWeight="medium">
                Standards
              </PMText>
              <PMHStack justify="space-between">
                <PMText fontSize="sm">
                  {health.embeddedStandards} / {health.totalStandards}
                </PMText>
                <PMText fontSize="sm" fontWeight="medium">
                  {health.totalStandards > 0
                    ? (
                        (health.embeddedStandards / health.totalStandards) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </PMText>
              </PMHStack>
            </PMVStack>

            <PMVStack align="stretch" gap={1} flex={1}>
              <PMText fontSize="sm" fontWeight="medium">
                Recipes
              </PMText>
              <PMHStack justify="space-between">
                <PMText fontSize="sm">
                  {health.embeddedRecipes} / {health.totalRecipes}
                </PMText>
                <PMText fontSize="sm" fontWeight="medium">
                  {health.totalRecipes > 0
                    ? (
                        (health.embeddedRecipes / health.totalRecipes) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </PMText>
              </PMHStack>
            </PMVStack>
          </PMHStack>
        </PMVStack>
      </PMVStack>
    </PMBox>
  );
}
