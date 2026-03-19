import { PMBox, PMText } from '@packmind/ui';
import { useMemo } from 'react';
import { Rule, Standard } from '@packmind/types';
import { serializeStandardToMarkdown } from '../../utils/serializeArtifactToMarkdown';
import { ArtifactResultFilePreview } from '../shared/ArtifactResultFilePreview';

interface StandardOriginalTabContentProps {
  standard: Standard;
  rules: Rule[];
}

export function StandardOriginalTabContent({
  standard,
  rules,
}: Readonly<StandardOriginalTabContentProps>) {
  const markdown = useMemo(
    () =>
      serializeStandardToMarkdown({
        name: standard.name,
        scope: standard.scope ?? '',
        description: standard.description,
        rules,
      }),
    [standard, rules],
  );

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
        fileName={`standard-${standard.slug}.md`}
        markdown={markdown}
      />
    </PMBox>
  );
}
