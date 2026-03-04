import { useMemo } from 'react';
import { PMBox, PMVStack } from '@packmind/ui';
import { DiffSection, buildDiffSections } from '../../utils/buildDiffSections';
import { DiffBlock } from './DiffBlock';

interface DiffViewProps {
  oldValue: string;
  newValue: string;
  isMarkdownContent: boolean;
  filePath?: string;
}

function isChanged(
  section: DiffSection,
): section is Extract<DiffSection, { type: 'changed' }> {
  return section.type === 'changed';
}

export function DiffView({
  oldValue,
  newValue,
  isMarkdownContent,
  filePath,
}: Readonly<DiffViewProps>) {
  const changedSections = useMemo(
    () => buildDiffSections(oldValue, newValue).filter(isChanged),
    [oldValue, newValue],
  );

  return (
    <PMVStack gap={3} alignItems="stretch">
      {changedSections.map((section, index) => (
        <PMBox key={index}>
          {section.oldValue && (
            <DiffBlock
              value={section.oldValue}
              variant="removed"
              isMarkdown={isMarkdownContent}
              filePath={filePath}
            />
          )}
          {section.newValue && (
            <PMBox mt={section.oldValue ? 2 : 0}>
              <DiffBlock
                value={section.newValue}
                variant="added"
                isMarkdown={isMarkdownContent}
                filePath={filePath}
              />
            </PMBox>
          )}
        </PMBox>
      ))}
    </PMVStack>
  );
}
