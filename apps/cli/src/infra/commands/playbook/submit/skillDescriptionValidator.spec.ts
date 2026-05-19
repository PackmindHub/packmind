import { ChangeProposalType } from '@packmind/types';

import { ProposalItem } from './proposalBuilder';
import { validateProposalSkillDescriptions } from './skillDescriptionValidator';

function makeCreateSkillProposal(
  name: string,
  description: string,
): ProposalItem {
  return {
    type: ChangeProposalType.createSkill,
    artefactId: null,
    payload: {
      name,
      description,
      prompt: 'body',
      skillMdPermissions: 'rw-r--r--',
    },
    targetId: undefined,
    spaceId: 'space-1',
  };
}

function makeUpdateDescriptionProposal(
  artefactId: string,
  oldValue: string,
  newValue: string,
): ProposalItem {
  return {
    type: ChangeProposalType.updateSkillDescription,
    artefactId,
    payload: { oldValue, newValue },
    targetId: undefined,
    spaceId: 'space-1',
  };
}

describe('validateProposalSkillDescriptions', () => {
  describe('when all skill descriptions are within the limit', () => {
    it('returns no errors', () => {
      const proposals: ProposalItem[] = [
        makeCreateSkillProposal('skill-a', 'short description'),
        makeUpdateDescriptionProposal('skill-b-id', 'old', 'new'),
      ];

      expect(validateProposalSkillDescriptions(proposals)).toEqual([]);
    });
  });

  describe('when a createSkill payload exceeds 1024 chars', () => {
    it('returns an actionable error mentioning the skill name', () => {
      const longDescription = 'a'.repeat(1025);
      const proposals: ProposalItem[] = [
        makeCreateSkillProposal('my-skill', longDescription),
      ];

      const errors = validateProposalSkillDescriptions(proposals);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Skill "my-skill"');
      expect(errors[0]).toContain('1025 characters');
      expect(errors[0]).toContain('maximum of 1024');
    });
  });

  describe('when an updateSkillDescription payload exceeds 1024 chars', () => {
    it('returns an actionable error mentioning the artefactId', () => {
      const longValue = 'b'.repeat(1500);
      const proposals: ProposalItem[] = [
        makeUpdateDescriptionProposal('skill-uuid-123', 'old', longValue),
      ];

      const errors = validateProposalSkillDescriptions(proposals);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('skill-uuid-123');
      expect(errors[0]).toContain('1500 characters');
      expect(errors[0]).toContain('maximum of 1024');
    });
  });

  describe('when a description is exactly 1024 chars', () => {
    it('accepts it', () => {
      const exact = 'a'.repeat(1024);
      const proposals: ProposalItem[] = [
        makeCreateSkillProposal('edge', exact),
      ];

      expect(validateProposalSkillDescriptions(proposals)).toEqual([]);
    });
  });

  describe('when multiple proposals are oversized', () => {
    it('returns one error per offending proposal', () => {
      const proposals: ProposalItem[] = [
        makeCreateSkillProposal('skill-a', 'a'.repeat(2000)),
        makeUpdateDescriptionProposal('skill-b', 'old', 'b'.repeat(2000)),
        makeCreateSkillProposal('skill-c', 'ok'),
      ];

      const errors = validateProposalSkillDescriptions(proposals);
      expect(errors).toHaveLength(2);
    });
  });

  describe('when proposals are unrelated to skill descriptions', () => {
    it('ignores them', () => {
      const proposals: ProposalItem[] = [
        {
          type: ChangeProposalType.updateSkillName,
          artefactId: 'skill-id',
          payload: { oldValue: 'a', newValue: 'b' },
          targetId: undefined,
          spaceId: 'space-1',
        },
        {
          type: ChangeProposalType.createCommand,
          artefactId: null,
          payload: { name: 'foo', content: 'bar' },
          targetId: undefined,
          spaceId: 'space-1',
        },
      ];

      expect(validateProposalSkillDescriptions(proposals)).toEqual([]);
    });
  });
});
