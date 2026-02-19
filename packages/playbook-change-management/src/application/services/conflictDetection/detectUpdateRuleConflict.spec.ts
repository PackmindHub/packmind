import { changeProposalFactory } from '../../../../test';
import { ruleFactory } from '@packmind/standards/test';
import {
  ChangeProposal,
  ChangeProposalType,
  CollectionItemUpdatePayload,
  createStandardId,
  Rule,
  RuleId,
} from '@packmind/types';
import { DiffService } from '../DiffService';
import { detectUpdateRuleConflict } from './detectUpdateRuleConflict';

describe('detectUpdateRuleConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.updateRule>;
  let diffService: jest.Mocked<DiffService>;
  let rule: Rule;
  let payload: CollectionItemUpdatePayload<RuleId>;

  beforeEach(() => {
    rule = ruleFactory();
    payload = {
      targetId: rule.id,
      oldValue: 'Some old value',
      newValue: 'Some new value',
    };

    changeProposal = changeProposalFactory({
      type: ChangeProposalType.updateRule,
      payload,
    }) as ChangeProposal<ChangeProposalType.updateRule>;
    diffService = {} as jest.Mocked<DiffService>;
  });

  it('returns false if change proposals have the same id', () => {
    expect(
      detectUpdateRuleConflict(
        changeProposal,
        changeProposalFactory({ id: changeProposal.id }),
        diffService,
      ),
    ).toEqual(false);
  });

  it('returns false if second proposal targets another standard', () => {
    expect(
      detectUpdateRuleConflict(
        changeProposal,
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: createStandardId(`${changeProposal.artefactId}-1`),
        }),
        diffService,
      ),
    ).toEqual(false);
  });

  describe('when second change proposal type is a ChangeProposalType.updateRule', () => {
    it('returns false if proposals do not target the same rule', () => {
      const secondRule = ruleFactory({
        standardVersionId: rule.standardVersionId,
        content: 'Some other content',
      });

      expect(
        detectUpdateRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: changeProposal.type,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: secondRule.id,
              oldValue: 'whatever',
              newValue: 'whatever too',
            },
          }),
          diffService,
        ),
      ).toEqual(false);
    });

    it('returns false if proposals have the same payload', () => {
      expect(
        detectUpdateRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: changeProposal.type,
            artefactId: changeProposal.artefactId,
            payload: changeProposal.payload,
          }),
          diffService,
        ),
      ).toEqual(false);
    });

    it('returns true if proposals have different content', () => {
      expect(
        detectUpdateRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: changeProposal.type,
            artefactId: changeProposal.artefactId,
            payload: {
              ...changeProposal.payload,
              newValue: 'A conflicting new value',
            },
          }),
          diffService,
        ),
      ).toEqual(true);
    });
  });

  describe('when second change proposal type is a ChangeProposalType.deleteRule', () => {
    it('returns false if second proposal does not target the same rule', () => {
      const secondRule = ruleFactory({
        standardVersionId: rule.standardVersionId,
        content: 'Some other content',
      });

      expect(
        detectUpdateRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.deleteRule,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: secondRule.id,
              item: secondRule,
            },
          }),
          diffService,
        ),
      ).toEqual(false);
    });

    it('returns true if second proposal targets the same rule', () => {
      expect(
        detectUpdateRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.deleteRule,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: rule.id,
              item: rule,
            },
          }),
          diffService,
        ),
      ).toEqual(true);
    });
  });
});
