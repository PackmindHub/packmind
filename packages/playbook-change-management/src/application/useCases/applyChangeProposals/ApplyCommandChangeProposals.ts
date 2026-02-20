import { AbstractApplyChangeProposals } from './AbstractApplyChangeProposals';
import {
  ChangeProposal,
  ChangeProposalType,
  Recipe,
  RecipeVersion,
} from '@packmind/types';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';
import { DiffService } from '../../services/DiffService';
import { ChangeProposalConflictError } from '../../../domain/errors';

export class ApplyCommandChangeProposals extends AbstractApplyChangeProposals<RecipeVersion> {
  constructor(private readonly diffService: DiffService) {
    super();
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
        name: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateCommandDescription,
      )
    ) {
      const diffResult = this.diffService.applyLineDiff(
        changeProposal.payload.oldValue,
        changeProposal.payload.newValue,
        source.content,
      );

      if (!diffResult.success) {
        throw new ChangeProposalConflictError(changeProposal.id);
      }

      return {
        ...source,
        content: diffResult.value,
      };
    }
    throw new Error('Method not implemented.');
  }

  saveNewVersion(version: RecipeVersion): Promise<Recipe> {
    throw new Error('Method not implemented.');
  }
}
