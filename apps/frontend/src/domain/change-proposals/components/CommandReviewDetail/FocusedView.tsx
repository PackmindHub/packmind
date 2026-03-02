import { PMBox, PMHeading, PMMarkdownViewer, PMText } from '@packmind/ui';
import { ChangeProposalType, Recipe } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { DiffBlock } from './DiffBlock';

interface FocusedViewProps {
  recipe: Recipe;
  proposal: ChangeProposalWithConflicts;
}

export function FocusedView({ recipe, proposal }: Readonly<FocusedViewProps>) {
  const isDescriptionChange =
    proposal.type === ChangeProposalType.updateCommandDescription;
  const isNameChange = proposal.type === ChangeProposalType.updateCommandName;

  const payload = proposal.payload as { oldValue: string; newValue: string };

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
        <PMBox borderRadius="md" p={4}>
          <PMBox mb={3}>
            <PMText fontSize="xs" fontWeight="semibold" color="secondary">
              Instructions change
            </PMText>
          </PMBox>
          <DiffBlock
            value={payload.oldValue}
            variant="removed"
            isMarkdown={true}
          />
          <PMBox mt={2}>
            <DiffBlock
              value={payload.newValue}
              variant="added"
              isMarkdown={true}
            />
          </PMBox>
        </PMBox>
      </PMBox>
    );
  }

  return null;
}
