import { changeProposalFactory } from '../../../../test';
import {
  ChangeProposal,
  ChangeProposalStatus,
  ChangeProposalType,
  createStandardId,
  ScalarUpdatePayload,
} from '@packmind/types';
import { DiffService } from '../DiffService';
import { detectMultiLineConflict } from './detectMultiLineConflict';

describe('detectMultiLineConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.updateStandardDescription>;
  let diffService: jest.Mocked<DiffService>;
  const payload: ScalarUpdatePayload = {
    oldValue: 'Some data',
    newValue: 'Some new data',
  };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.updateStandardDescription,
      payload,
    }) as ChangeProposal<ChangeProposalType.updateStandardDescription>;
    diffService = {
      applyLineDiff: jest.fn(),
      hasConflict: jest.fn(),
    };
  });

  it('returns false if items have the same id', () => {
    expect(
      detectMultiLineConflict(
        changeProposal,
        changeProposalFactory({ id: changeProposal.id }),
        diffService,
      ),
    ).toEqual(false);
  });

  it("returns false if items don't have the same type", () => {
    expect(
      detectMultiLineConflict(
        changeProposal,
        changeProposalFactory({ type: ChangeProposalType.updateCommandName }),
        diffService,
      ),
    ).toEqual(false);
  });

  it("returns false if items don't target the same artefact", () => {
    expect(
      detectMultiLineConflict(
        changeProposal,
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: createStandardId(`${changeProposal.artefactId}-1`),
        }),
        diffService,
      ),
    ).toEqual(false);
  });

  it('uses diffService.hasConflict to check if there is a conflict', () => {
    detectMultiLineConflict(
      changeProposal,
      changeProposalFactory({
        type: changeProposal.type,
        artefactId: changeProposal.artefactId,
        payload: {
          ...changeProposal.payload,
          newValue: 'This is another change proposal',
        },
      }),

      diffService,
    );

    expect(diffService.hasConflict).toHaveBeenCalledWith(
      changeProposal.payload.oldValue,
      changeProposal.payload.newValue,
      'This is another change proposal',
    );
  });

  it('returns the result of diffService.hasConflict', () => {
    diffService.hasConflict.mockReturnValue(true);

    expect(
      detectMultiLineConflict(
        changeProposal,
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: changeProposal.artefactId,
          payload: {
            ...changeProposal.payload,
            newValue: 'This is another change proposal',
          },
        }),

        diffService,
      ),
    ).toEqual(true);
  });

  describe('when decision is set', () => {
    describe('when both proposals have decision', () => {
      it('passes decision newValues to diffService.hasConflict instead of payload newValues', () => {
        const cp1 = changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          artefactId: changeProposal.artefactId,
          payload: { oldValue: 'base text', newValue: 'payload-change-1' },
          status: ChangeProposalStatus.applied,
          decision: { oldValue: 'base text', newValue: 'decision-change-1' },
        }) as ChangeProposal<ChangeProposalType.updateStandardDescription>;

        const cp2 = changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          artefactId: changeProposal.artefactId,
          payload: { oldValue: 'base text', newValue: 'payload-change-2' },
          status: ChangeProposalStatus.applied,
          decision: { oldValue: 'base text', newValue: 'decision-change-2' },
        }) as ChangeProposal<ChangeProposalType.updateStandardDescription>;

        detectMultiLineConflict(cp1, cp2, diffService);

        expect(diffService.hasConflict).toHaveBeenCalledWith(
          'base text',
          'decision-change-1',
          'decision-change-2',
        );
      });
    });

    describe('when only one proposal has decision', () => {
      it('passes decision newValue for one and payload newValue for the other', () => {
        const cpWithDecision = changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          artefactId: changeProposal.artefactId,
          payload: { oldValue: 'base text', newValue: 'payload-change' },
          status: ChangeProposalStatus.applied,
          decision: { oldValue: 'base text', newValue: 'decision-change' },
        }) as ChangeProposal<ChangeProposalType.updateStandardDescription>;

        const cpWithoutDecision = changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          artefactId: changeProposal.artefactId,
          payload: { oldValue: 'base text', newValue: 'other-change' },
        }) as ChangeProposal<ChangeProposalType.updateStandardDescription>;

        detectMultiLineConflict(cpWithDecision, cpWithoutDecision, diffService);

        expect(diffService.hasConflict).toHaveBeenCalledWith(
          'base text',
          'decision-change',
          'other-change',
        );
      });
    });

    describe('when proposals have different payload oldValues', () => {
      let cp1: ChangeProposal<ChangeProposalType.updateStandardDescription>;
      let cp2: ChangeProposal<ChangeProposalType.updateStandardDescription>;

      beforeEach(() => {
        cp1 = changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          artefactId: changeProposal.artefactId,
          payload: { oldValue: 'base-1', newValue: 'change-1' },
          status: ChangeProposalStatus.applied,
          decision: { oldValue: 'decision-base', newValue: 'decision-change' },
        }) as ChangeProposal<ChangeProposalType.updateStandardDescription>;

        cp2 = changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          artefactId: changeProposal.artefactId,
          payload: { oldValue: 'base-2', newValue: 'change-2' },
        }) as ChangeProposal<ChangeProposalType.updateStandardDescription>;
      });

      it('returns false', () => {
        expect(detectMultiLineConflict(cp1, cp2, diffService)).toEqual(false);
      });

      it('does not call diffService.hasConflict', () => {
        detectMultiLineConflict(cp1, cp2, diffService);
        expect(diffService.hasConflict).not.toHaveBeenCalled();
      });
    });
  });
});
