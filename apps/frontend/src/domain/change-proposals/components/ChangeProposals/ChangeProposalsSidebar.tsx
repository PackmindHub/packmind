import {
  PMBadge,
  PMHStack,
  PMLink,
  PMText,
  PMVerticalNav,
  PMVerticalNavSection,
} from '@packmind/ui';
import { RecipeId } from '@packmind/types';

interface ChangeProposalsSidebarProps {
  recipes: Array<{ id: RecipeId; name: string }>;
  proposalCounts: Map<RecipeId, number>;
  selectedRecipeId: RecipeId | null;
  onSelectRecipe: (recipeId: RecipeId) => void;
}

export function ChangeProposalsSidebar({
  recipes,
  proposalCounts,
  selectedRecipeId,
  onSelectRecipe,
}: ChangeProposalsSidebarProps) {
  const commandEntries = recipes.map((recipe) => {
    const pendingCount = proposalCounts.get(recipe.id) ?? 0;
    const isActive = recipe.id === selectedRecipeId;

    return (
      <PMLink
        key={recipe.id}
        as="button"
        type="button"
        variant="navbar"
        data-active={isActive ? 'true' : undefined}
        width="full"
        textAlign="left"
        py={2}
        display="flex"
        alignItems="center"
        textDecoration="none"
        fontWeight={isActive ? 'bold' : 'medium'}
        _hover={{
          fontWeight: isActive ? 'bold' : 'medium',
          textDecoration: 'none',
        }}
        _focus={{ outline: 'none', boxShadow: 'none' }}
        _focusVisible={{ outline: 'none', boxShadow: 'none' }}
        overflow="hidden"
        onClick={() => onSelectRecipe(recipe.id)}
      >
        <PMHStack width="full" justifyContent="space-between" gap={2}>
          <PMText
            fontSize="sm"
            fontWeight={isActive ? 'bold' : 'medium'}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            flex={1}
          >
            {recipe.name}
          </PMText>
          <PMBadge colorPalette="blue" size="sm">
            {pendingCount}
          </PMBadge>
        </PMHStack>
      </PMLink>
    );
  });

  return (
    <PMVerticalNav logo={false} showLogoContainer={false} width="270px">
      <PMVerticalNavSection title="Commands" navEntries={commandEntries} />
    </PMVerticalNav>
  );
}
