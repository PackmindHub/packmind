import { PMBox, PMHeading, PMMarkdownViewer, PMText } from '@packmind/ui';
import { Recipe } from '@packmind/types';
import { stripFrontmatter } from '../../utils/stripFrontmatter';

interface OriginalTabContentProps {
  recipe: Recipe;
}

export function OriginalTabContent({
  recipe,
}: Readonly<OriginalTabContentProps>) {
  return (
    <PMBox p={6}>
      <PMBox mb={6}>
        <PMText
          fontSize="2xs"
          fontWeight="medium"
          textTransform="uppercase"
          color="faded"
        >
          Original Version
        </PMText>
      </PMBox>
      <PMHeading size="md" mb={4}>
        {recipe.name}
      </PMHeading>
      <PMMarkdownViewer content={stripFrontmatter(recipe.content)} />
    </PMBox>
  );
}
