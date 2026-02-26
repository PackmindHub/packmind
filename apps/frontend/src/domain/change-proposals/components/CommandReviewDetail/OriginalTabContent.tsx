import { PMBox, PMHeading, PMMarkdownViewer, PMText } from '@packmind/ui';
import { Recipe } from '@packmind/types';

interface OriginalTabContentProps {
  recipe: Recipe;
}

export function OriginalTabContent({
  recipe,
}: Readonly<OriginalTabContentProps>) {
  return (
    <PMBox p={6}>
      <PMText
        fontSize="xs"
        fontWeight="semibold"
        textTransform="uppercase"
        color="secondary"
        mb={3}
      >
        Original Version
      </PMText>
      <PMHeading size="md" mb={4}>
        {recipe.name}
      </PMHeading>
      <PMMarkdownViewer content={recipe.content} />
    </PMBox>
  );
}
