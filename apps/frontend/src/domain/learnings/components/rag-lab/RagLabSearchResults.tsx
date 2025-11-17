import { Link, useParams } from 'react-router';
import {
  PMBox,
  PMHeading,
  PMHStack,
  PMLink,
  PMText,
  PMVStack,
  PMBadge,
} from '@packmind/ui';
import { SearchArtifactsBySemanticsResponse } from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';

interface RagLabSearchResultsProps {
  results: SearchArtifactsBySemanticsResponse;
}

export function RagLabSearchResults({ results }: RagLabSearchResultsProps) {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();

  const hasResults = results.standards.length > 0 || results.recipes.length > 0;

  if (!hasResults) {
    return (
      <PMBox p={8} textAlign="center">
        <PMText>
          No results found. Try adjusting your search query or lowering the
          similarity threshold.
        </PMText>
      </PMBox>
    );
  }

  return (
    <PMVStack align="stretch" gap={6}>
      {results.standards.length > 0 && (
        <PMVStack align="stretch" gap={4}>
          <PMHeading size="md">
            Standards ({results.standards.length})
          </PMHeading>
          <PMVStack align="stretch" gap={3}>
            {results.standards.map((standard) => (
              <PMBox
                key={standard.id}
                p={4}
                borderWidth="1px"
                borderRadius="md"
              >
                <PMVStack align="stretch" gap={2}>
                  <PMHStack justify="space-between" align="start">
                    <PMLink asChild fontWeight="semibold" fontSize="lg">
                      <Link
                        to={routes.space.toStandard(
                          orgSlug!,
                          spaceSlug!,
                          standard.standardId,
                        )}
                      >
                        {standard.slug}
                      </Link>
                    </PMLink>
                    <PMBadge colorScheme="blue">
                      {(standard.similarity * 100).toFixed(1)}% match
                    </PMBadge>
                  </PMHStack>
                  {standard.description && (
                    <PMText>{standard.description.substring(0, 200)}...</PMText>
                  )}
                </PMVStack>
              </PMBox>
            ))}
          </PMVStack>
        </PMVStack>
      )}

      {results.recipes.length > 0 && (
        <PMVStack align="stretch" gap={4}>
          <PMHeading size="md">Recipes ({results.recipes.length})</PMHeading>
          <PMVStack align="stretch" gap={3}>
            {results.recipes.map((recipe) => (
              <PMBox key={recipe.id} p={4} borderWidth="1px" borderRadius="md">
                <PMVStack align="stretch" gap={2}>
                  <PMHStack justify="space-between" align="start">
                    <PMLink asChild fontWeight="semibold" fontSize="lg">
                      <Link
                        to={routes.space.toRecipe(
                          orgSlug!,
                          spaceSlug!,
                          recipe.recipeId,
                        )}
                      >
                        {recipe.slug}
                      </Link>
                    </PMLink>
                    <PMBadge colorScheme="green">
                      {(recipe.similarity * 100).toFixed(1)}% match
                    </PMBadge>
                  </PMHStack>
                  {recipe.content && (
                    <PMText>{recipe.content.substring(0, 200)}...</PMText>
                  )}
                </PMVStack>
              </PMBox>
            ))}
          </PMVStack>
        </PMVStack>
      )}
    </PMVStack>
  );
}
