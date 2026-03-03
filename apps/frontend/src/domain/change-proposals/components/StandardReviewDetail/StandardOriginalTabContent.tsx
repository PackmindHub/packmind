import {
  PMBox,
  PMHeading,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { Rule, Standard } from '@packmind/types';

interface StandardOriginalTabContentProps {
  standard: Standard;
  rules: Rule[];
}

export function StandardOriginalTabContent({
  standard,
  rules,
}: Readonly<StandardOriginalTabContentProps>) {
  const sortedRules = [...rules].sort((a, b) =>
    a.content.toLowerCase().localeCompare(b.content.toLowerCase()),
  );

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
        {standard.name}
      </PMHeading>
      <PMMarkdownViewer content={standard.description} />

      {sortedRules.length > 0 && (
        <PMVStack gap={2} align="stretch" marginTop={6}>
          <PMText fontSize="md" fontWeight="semibold">
            Rules
          </PMText>
          {sortedRules.map((rule) => (
            <PMBox key={rule.id} p={3} bg="background.tertiary">
              <PMText fontSize="sm" color="primary">
                {rule.content}
              </PMText>
            </PMBox>
          ))}
        </PMVStack>
      )}
    </PMBox>
  );
}
