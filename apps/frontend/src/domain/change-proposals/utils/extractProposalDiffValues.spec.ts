import { ChangeProposal, ChangeProposalType } from '@packmind/types';
import { extractProposalDiffValues } from './extractProposalDiffValues';

const makeProposal = (
  type: ChangeProposalType,
  payload: unknown,
): ChangeProposal =>
  ({
    id: 'proposal-1',
    type,
    payload,
  }) as unknown as ChangeProposal;

describe('extractProposalDiffValues', () => {
  describe('scalar update types', () => {
    it('returns oldValue and newValue directly', () => {
      const proposal = makeProposal(ChangeProposalType.updateSkillName, {
        oldValue: 'Old Name',
        newValue: 'New Name',
      });

      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: 'Old Name',
        newValue: 'New Name',
      });
    });
  });

  describe('updateSkillAdditionalProperty', () => {
    it('prepends the property key to old and new values', () => {
      const proposal = makeProposal(
        ChangeProposalType.updateSkillAdditionalProperty,
        {
          targetId: 'userInvocable',
          oldValue: 'false',
          newValue: 'true',
        },
      );

      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: 'user-invocable: false',
        newValue: 'user-invocable: true',
      });
    });

    it('converts disableModelInvocation to kebab-case', () => {
      const proposal = makeProposal(
        ChangeProposalType.updateSkillAdditionalProperty,
        {
          targetId: 'disableModelInvocation',
          oldValue: 'null',
          newValue: 'true',
        },
      );

      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: '',
        newValue: 'disable-model-invocation: true',
      });
    });

    it('returns empty string when value is empty (property added)', () => {
      const proposal = makeProposal(
        ChangeProposalType.updateSkillAdditionalProperty,
        {
          targetId: 'model',
          oldValue: '',
          newValue: 'sonnet',
        },
      );

      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: '',
        newValue: 'model: sonnet',
      });
    });

    it('returns empty string when old value is null sentinel (property added)', () => {
      const proposal = makeProposal(
        ChangeProposalType.updateSkillAdditionalProperty,
        { targetId: 'model', oldValue: 'null', newValue: 'sonnet' },
      );
      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: '',
        newValue: 'model: sonnet',
      });
    });

    it('returns empty string when new value is null sentinel (property removed)', () => {
      const proposal = makeProposal(
        ChangeProposalType.updateSkillAdditionalProperty,
        { targetId: 'model', oldValue: 'sonnet', newValue: 'null' },
      );
      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: 'model: sonnet',
        newValue: '',
      });
    });

    it('returns empty string when new value is empty (property removed)', () => {
      const proposal = makeProposal(
        ChangeProposalType.updateSkillAdditionalProperty,
        {
          targetId: 'context',
          oldValue: 'some-context',
          newValue: '',
        },
      );

      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: 'context: some-context',
        newValue: '',
      });
    });
  });

  describe('collection update types', () => {
    it('returns oldValue and newValue without targetId', () => {
      const proposal = makeProposal(ChangeProposalType.updateRule, {
        targetId: 'rule-1',
        oldValue: 'old rule text',
        newValue: 'new rule text',
      });

      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: 'old rule text',
        newValue: 'new rule text',
      });
    });
  });

  describe('collection add types', () => {
    it('returns empty oldValue and item content as newValue', () => {
      const proposal = makeProposal(ChangeProposalType.addRule, {
        item: { content: 'new rule content' },
      });

      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: '',
        newValue: 'new rule content',
      });
    });
  });

  describe('collection delete types', () => {
    it('returns item content as oldValue and empty newValue', () => {
      const proposal = makeProposal(ChangeProposalType.deleteRule, {
        item: { id: 'rule-1', content: 'deleted rule content' },
      });

      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: 'deleted rule content',
        newValue: '',
      });
    });
  });

  describe('unknown type', () => {
    it('returns empty values', () => {
      const proposal = makeProposal('unknownType' as ChangeProposalType, {});

      expect(extractProposalDiffValues(proposal)).toEqual({
        oldValue: '',
        newValue: '',
      });
    });
  });
});
