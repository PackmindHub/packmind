import { useMemo } from 'react';
import { PMBox, PMMarkdownViewer } from '@packmind/ui';
import { ChangeProposalWithConflicts } from '../../types';
import { extractProposalDiffValues } from '../../utils/extractProposalDiffValues';
import { isMarkdownContent } from '../../utils/isMarkdownContent';
import { buildDiffSections } from '../../utils/buildDiffSections';
import { DiffBlock } from '../shared/DiffBlock';

interface StandardFocusedViewProps {
  proposal: ChangeProposalWithConflicts;
}

export function StandardFocusedView({
  proposal,
}: Readonly<StandardFocusedViewProps>) {
  const { oldValue, newValue } = extractProposalDiffValues(proposal);
  const markdown = isMarkdownContent(proposal.type);

  const sections = useMemo(
    () => (markdown ? buildDiffSections(oldValue, newValue) : []),
    [markdown, oldValue, newValue],
  );

  if (markdown) {
    return (
      <PMBox>
        {sections.map((section, index) =>
          section.type === 'unchanged' ? (
            <PMMarkdownViewer key={index} content={section.value} />
          ) : (
            <PMBox
              key={index}
              borderRadius="md"
              border="1px dashed"
              borderColor="border.tertiary"
              p={4}
              my={2}
            >
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
          ),
        )}
      </PMBox>
    );
  }

  return (
    <PMBox>
      <PMBox borderRadius="md" p={4}>
        {oldValue && (
          <DiffBlock value={oldValue} variant="removed" isMarkdown={false} />
        )}
        {newValue && (
          <PMBox mt={oldValue ? 2 : 0}>
            <DiffBlock value={newValue} variant="added" isMarkdown={false} />
          </PMBox>
        )}
      </PMBox>
    </PMBox>
  );
}
