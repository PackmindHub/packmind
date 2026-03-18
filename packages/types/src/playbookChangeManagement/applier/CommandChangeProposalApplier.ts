import { AbstractChangeProposalApplier } from './AbstractChangeProposalApplier';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';
import { RecipeVersion } from '../../recipes/RecipeVersion';
import { isExpectedChangeProposalType } from './isExpectedChangeProposalType';
import { RECIPE_CHANGE_TYPES } from './types';

export class CommandChangeProposalApplier extends AbstractChangeProposalApplier<RecipeVersion> {
  areChangesApplicable(changeProposals: ChangeProposal[]): boolean {
    return this.checkChangesApplicable(changeProposals, RECIPE_CHANGE_TYPES);
  }

  protected applyChangeProposal(
    source: RecipeVersion,
    changeProposal: ChangeProposal,
  ): RecipeVersion {
    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateCommandName,
      )
    ) {
      return {
        ...source,
        name: this.getEffectivePayload(changeProposal).newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateCommandDescription,
      )
    ) {
      return {
        ...source,
        content: this.applyDiff(
          changeProposal.id,
          this.getEffectivePayload(changeProposal),
          source.content,
        ),
      };
    }
    return source;
  }
}
