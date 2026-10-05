import { AbstractChangeProposalApplier } from './AbstractChangeProposalApplier';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';
import { StandardVersion } from '../../standards/StandardVersion';
import { createRuleId, RuleId } from '../../standards/RuleId';
import { ChangeProposalConflictError } from './ChangeProposalConflictError';
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
        name: this.applyDiff(
          changeProposal.id,
          this.getEffectivePayload(changeProposal),
          source.name,
        ),
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
        scope: this.applyDiff(
          changeProposal.id,
          this.getEffectivePayload(changeProposal),
          source.scope ?? '',
        ),
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
          this.getEffectivePayload(changeProposal),
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
      const targetId = changeProposal.payload.targetId;

      // A client reading standards from Markdown has no rule ids to send, so
      // it names the rule by the content it is replacing instead.
      let fallbackId: RuleId | undefined;
      if (!rules.some((rule) => rule.id === targetId)) {
        const matches = rules.filter(
          (rule) =>
            rule.content === this.getEffectivePayload(changeProposal).oldValue,
        );
        if (matches.length !== 1) {
          throw new ChangeProposalConflictError(changeProposal.id);
        }
        fallbackId = matches[0].id;
      }

      const updatedRules = rules.map((rule) => {
        if (rule.id !== targetId && rule.id !== fallbackId) {
          return rule;
        }

        return {
          ...rule,
          content: this.applyDiff(
            changeProposal.id,
            this.getEffectivePayload(changeProposal),
            rule.content,
          ),
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
      const targetId = changeProposal.payload.targetId;

      if (rules.some((rule) => rule.id === targetId)) {
        return {
          ...source,
          rules: rules.filter((rule) => rule.id !== targetId),
        };
      }

      // Every copy goes: the standard is meant to be rid of that content, and
      // copies hold no id to tell them apart.
      const removed = this.getEffectivePayload(changeProposal).item.content;
      const remaining = rules.filter((rule) => rule.content !== removed);

      if (remaining.length === rules.length) {
        throw new ChangeProposalConflictError(changeProposal.id);
      }

      return {
        ...source,
        rules: remaining,
      };
    }

    return source;
  }
}
