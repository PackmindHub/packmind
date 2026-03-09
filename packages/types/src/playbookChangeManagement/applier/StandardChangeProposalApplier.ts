import { AbstractChangeProposalApplier } from './AbstractChangeProposalApplier';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';
import { StandardVersion } from '../../standards/StandardVersion';
import { createRuleId } from '../../standards/RuleId';
import { isExpectedChangeProposalType } from './isExpectedChangeProposalType';
import { STANDARD_CHANGE_TYPES } from './types';

export class StandardChangeProposalApplier extends AbstractChangeProposalApplier<StandardVersion> {
  areChangesApplicable(changeProposals: ChangeProposal[]): boolean {
    return this.checkChangesApplicable(changeProposals, STANDARD_CHANGE_TYPES);
  }

  protected applyChangeProposal(
    source: StandardVersion,
    changeProposal: ChangeProposal,
  ): StandardVersion {
    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateStandardName,
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
        ChangeProposalType.updateStandardScope,
      )
    ) {
      return {
        ...source,
        scope: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateStandardDescription,
      )
    ) {
      return {
        ...source,
        description: this.applyDiff(
          changeProposal.id,
          changeProposal.payload,
          source.description,
        ),
      };
    }

    if (
      isExpectedChangeProposalType(changeProposal, ChangeProposalType.addRule)
    ) {
      const newRule = {
        ...changeProposal.payload.item,
        id: createRuleId(changeProposal.id),
        standardVersionId: source.id,
      };

      return {
        ...source,
        rules: [...(source.rules || []), newRule],
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateRule,
      )
    ) {
      const rules = source.rules || [];
      const updatedRules = rules.map((rule) => {
        if (rule.id !== changeProposal.payload.targetId) {
          return rule;
        }

        return {
          ...rule,
          content: changeProposal.payload.newValue,
        };
      });

      return {
        ...source,
        rules: updatedRules,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.deleteRule,
      )
    ) {
      const rules = source.rules || [];
      const filteredRules = rules.filter(
        (rule) => rule.id !== changeProposal.payload.targetId,
      );

      return {
        ...source,
        rules: filteredRules,
      };
    }

    return source;
  }
}
