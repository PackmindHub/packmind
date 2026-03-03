import { useMemo } from 'react';
import { PMBox, PMVStack } from '@packmind/ui';
import { DiffSection, buildDiffSections } from '../../utils/buildDiffSections';
import { DiffBlock } from './DiffBlock';

interface DiffViewProps {
  oldValue: string;
  newValue: string;
  isMarkdownContent: boolean;
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
}: Readonly<DiffViewProps>) {
  const changedSections = useMemo(
    () =>
      isMarkdownContent
        ? buildDiffSections(oldValue, newValue).filter(isChanged)
        : [],
    [oldValue, newValue, isMarkdownContent],
  );

  if (!isMarkdownContent) {
    return (
      <PMVStack gap={3} alignItems="stretch">
        {oldValue && (
          <DiffBlock value={oldValue} variant="removed" isMarkdown={false} />
        )}
        {newValue && (
          <DiffBlock value={newValue} variant="added" isMarkdown={false} />
        )}
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={3} alignItems="stretch">
      {changedSections.map((section, index) => (
        <PMBox key={index}>
          {section.oldValue && (
            <DiffBlock
              value={section.oldValue}
              variant="removed"
              isMarkdown={true}
            />
          )}
          {section.newValue && (
            <PMBox mt={section.oldValue ? 2 : 0}>
              <DiffBlock
                value={section.newValue}
                variant="added"
                isMarkdown={true}
              />
            </PMBox>
          )}
        </PMBox>
      ))}
    </PMVStack>
  );
}
