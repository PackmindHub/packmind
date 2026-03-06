import { type ReactNode, useMemo } from 'react';
import { PMBox, PMVStack } from '@packmind/ui';
import { buildDiffSections } from '../../utils/buildDiffSections';
import { DiffBlock } from './DiffBlock';
import { DiffSectionSeparator } from './DiffSectionSeparator';

interface FocusedViewProps {
  oldValue: string;
  newValue: string;
  isMarkdownContent: boolean;
  filePath?: string;
}

export function FocusedView({
  oldValue,
  newValue,
  isMarkdownContent,
  filePath,
}: Readonly<FocusedViewProps>) {
  const sections = useMemo(
    () => buildDiffSections(oldValue, newValue),
    [oldValue, newValue],
  );

  const elements = useMemo(() => {
    const result: ReactNode[] = [];
    let hadUnchangedBefore = false;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (section.type === 'unchanged') {
        hadUnchangedBefore = true;
        continue;
      }

      if (hadUnchangedBefore && result.length > 0) {
        result.push(<DiffSectionSeparator key={`sep-${i}`} />);
      }
      hadUnchangedBefore = false;

      result.push(
        <PMBox key={i}>
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
        </PMBox>,
      );
    }

    return result;
  }, [sections, isMarkdownContent, filePath]);

  return (
    <PMVStack gap={3} alignItems="stretch">
      {elements}
    </PMVStack>
  );
}
