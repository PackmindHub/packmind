import { useMemo } from 'react';
import { PMBox, PMHeading, PMMarkdownViewer, PMText } from '@packmind/ui';
import { ChangeProposalType, Recipe } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { buildDiffSections } from '../../utils/buildDiffSections';
import { DiffBlock } from '../shared/DiffBlock';

interface InlineViewProps {
  recipe: Recipe;
  proposal: ChangeProposalWithConflicts;
}

export function InlineView({ recipe, proposal }: Readonly<InlineViewProps>) {
  const isDescriptionChange =
    proposal.type === ChangeProposalType.updateCommandDescription;
  const isNameChange = proposal.type === ChangeProposalType.updateCommandName;

  const payload = proposal.payload as { oldValue: string; newValue: string };

  const sections = useMemo(
    () =>
      isDescriptionChange
        ? buildDiffSections(payload.oldValue, payload.newValue)
        : [],
    [isDescriptionChange, payload.oldValue, payload.newValue],
  );

  if (isNameChange) {
    return (
      <PMBox>
        <PMBox borderRadius="md" p={4} mb={4}>
          <PMBox mb={3}>
            <PMText fontSize="xs" fontWeight="semibold" color="secondary">
              Name change
            </PMText>
          </PMBox>
          {payload.newValue ? (
            <DiffBlock
              value={payload.newValue}
              variant="added"
              isMarkdown={false}
            />
          ) : (
            <DiffBlock
              value={payload.oldValue}
              variant="removed"
              isMarkdown={false}
            />
          )}
        </PMBox>
        <PMMarkdownViewer content={recipe.content} />
      </PMBox>
    );
  }

  if (isDescriptionChange) {
    return (
      <PMBox>
        <PMBox mb={2}>
          <PMHeading size="md">{recipe.name}</PMHeading>
        </PMBox>
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
              {section.newValue ? (
                <DiffBlock
                  value={section.newValue}
                  variant="added"
                  isMarkdown={true}
                  showIndicator={false}
                />
              ) : (
                <DiffBlock
                  value={section.oldValue}
                  variant="removed"
                  isMarkdown={true}
                  showIndicator={false}
                />
              )}
            </PMBox>
          ),
        )}
      </PMBox>
    );
  }

  return null;
}
