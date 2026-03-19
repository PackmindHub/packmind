import { PMBox, PMText } from '@packmind/ui';
import { Recipe } from '@packmind/types';
import { ArtifactResultFilePreview } from '../shared/ArtifactResultFilePreview';

interface OriginalTabContentProps {
  recipe: Recipe;
}

export function OriginalTabContent({
  recipe,
}: Readonly<OriginalTabContentProps>) {
  return (
    <PMBox p={6}>
      <PMText
        fontSize="2xs"
        fontWeight="medium"
        textTransform="uppercase"
        color="faded"
        mb={6}
      >
        Original Version
      </PMText>
      <ArtifactResultFilePreview
        fileName={`${recipe.slug}.md`}
        markdown={recipe.content}
      />
    </PMBox>
  );
}
