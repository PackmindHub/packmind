import { useMemo } from 'react';
import { PMBox, PMHeading, PMMarkdownViewer, PMText } from '@packmind/ui';
import { ChangeProposalType, Recipe } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { buildDiffSections } from '../../utils/buildDiffSections';
import { stripFrontmatter } from '../../utils/stripFrontmatter';
import { DiffBlock } from '../shared/DiffBlock';

interface DiffViewProps {
  recipe: Recipe;
  proposal: ChangeProposalWithConflicts;
}

export function DiffView({ recipe, proposal }: Readonly<DiffViewProps>) {
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
          <DiffBlock
            value={payload.oldValue}
            variant="removed"
            isMarkdown={false}
          />
          <PMBox mt={2}>
            <DiffBlock
              value={payload.newValue}
              variant="added"
              isMarkdown={false}
            />
          </PMBox>
        </PMBox>
        <PMBox fontSize="sm">
          <PMMarkdownViewer content={stripFrontmatter(recipe.content)} />
        </PMBox>
      </PMBox>
    );
  }

  if (isDescriptionChange) {
    return (
      <PMBox>
        <PMBox mb={2}>
          <PMHeading size="h5">{recipe.name}</PMHeading>
        </PMBox>
        <PMBox fontSize="sm">
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
      </PMBox>
    );
  }

  return null;
}
