import {
  ChangeProposal,
  ChangeProposalPayload,
  ChangeProposalType,
  createSkillId,
} from '@packmind/types';
import { DiffService } from '../DiffService';
import { changeProposalFactory } from '../../../../test';
import { detectUpdateSkillAdditionalPropertyConflict } from './detectUpdateSkillAdditionalPropertyConflict';

describe('detectUpdateSkillAdditionalPropertyConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.updateSkillAdditionalProperty>;
  let diffService: jest.Mocked<DiffService>;

  const payload: ChangeProposalPayload<ChangeProposalType.updateSkillAdditionalProperty> =
    {
      targetId: 'propertyKey',
      newValue: 'new-value',
      oldValue: 'old-value',
    };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillAdditionalProperty,
      payload,
    }) as ChangeProposal<ChangeProposalType.updateSkillAdditionalProperty>;
    diffService = {} as jest.Mocked<DiffService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('returns false if both proposals have the same id', () => {
    expect(
      detectUpdateSkillAdditionalPropertyConflict(
        changeProposal,
        changeProposalFactory({
          id: changeProposal.id,
        }),
        diffService,
      ),
    ).toBe(false);
  });

  it('returns false if proposals do not target the same artefact', () => {
    expect(
      detectUpdateSkillAdditionalPropertyConflict(
        changeProposal,
        changeProposalFactory({
          artefactId: createSkillId('another-skill-id'),
        }),
        diffService,
      ),
    ).toBe(false);
  });

  it('returns false if second proposal has a different type', () => {
    expect(
      detectUpdateSkillAdditionalPropertyConflict(
        changeProposal,
        changeProposalFactory({
          type: ChangeProposalType.updateRule,
          artefactId: changeProposal.artefactId,
        }),
        diffService,
      ),
    ).toBe(false);
  });

  describe('when second proposal is also an updateSkillAdditionalProperty', () => {
    it('returns false if same targetId but same newValue', () => {
      expect(
        detectUpdateSkillAdditionalPropertyConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.updateSkillAdditionalProperty,
            artefactId: changeProposal.artefactId,
            payload,
          }),
          diffService,
        ),
      ).toBe(false);
    });

    it('returns true if same targetId and different newValue', () => {
      expect(
        detectUpdateSkillAdditionalPropertyConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.updateSkillAdditionalProperty,
            artefactId: changeProposal.artefactId,
            payload: {
              ...payload,
              newValue: 'a-different-value',
            },
          }),
          diffService,
        ),
      ).toBe(true);
    });
  });
});
