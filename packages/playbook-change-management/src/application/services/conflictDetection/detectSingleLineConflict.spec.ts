import { changeProposalFactory } from '../../../../test';
import { detectSingleLineConflict } from './detectSingleLineConflict';
import {
  ChangeProposal,
  ChangeProposalPayload,
  ChangeProposalStatus,
  ChangeProposalType,
  createStandardId,
} from '@packmind/types';
import { DiffService } from '../DiffService';

describe('singleLineConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.updateStandardName>;
  let diffService: jest.Mocked<DiffService>;
  const payload: ChangeProposalPayload<ChangeProposalType.updateStandardName> =
    {
      oldValue: 'The old value',
      newValue: 'The new value',
    };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.updateStandardName,
      payload,
    }) as ChangeProposal<ChangeProposalType.updateStandardName>;
    diffService = {} as jest.Mocked<DiffService>;
  });

  it('returns false if items have the same id', () => {
    expect(
      detectSingleLineConflict(
        changeProposal,
        changeProposalFactory({ id: changeProposal.id }),
        diffService,
      ),
    ).toEqual(false);
  });

  it("returns false if items don't have the same type", () => {
    expect(
      detectSingleLineConflict(
        changeProposal,
        changeProposalFactory({ type: ChangeProposalType.updateCommandName }),
        diffService,
      ),
    ).toEqual(false);
  });

  it("returns false if items don't target the same artefact", () => {
    expect(
      detectSingleLineConflict(
        changeProposal,
        changeProposalFactory({
          artefactId: createStandardId(`${changeProposal.artefactId}-1`),
        }),
        diffService,
      ),
    ).toEqual(false);
  });

  it('returns false if the two proposals target the same artefact with the same values', () => {
    expect(
      detectSingleLineConflict(
        changeProposal,
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: changeProposal.artefactId,
          payload,
        }),
        diffService,
      ),
    ).toEqual(false);
  });

  it('returns true if the two proposals target the same artefact with different values', () => {
    expect(
      detectSingleLineConflict(
        changeProposal,
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: changeProposal.artefactId,
          payload: {
            ...changeProposal.payload,
            newValue: 'Some different new value',
          },
        }),
        diffService,
      ),
    ).toEqual(true);
  });

  describe('when decision is set', () => {
    describe('when both proposals have decision', () => {
      describe('when decision newValues match', () => {
        it('returns false even though payload newValues differ', () => {
          const cp1 = changeProposalFactory({
            type: ChangeProposalType.updateStandardName,
            artefactId: changeProposal.artefactId,
            payload: { oldValue: 'old', newValue: 'payload-value-1' },
            status: ChangeProposalStatus.applied,
            decision: { oldValue: 'old', newValue: 'agreed-value' },
          }) as ChangeProposal<ChangeProposalType.updateStandardName>;

          const cp2 = changeProposalFactory({
            type: ChangeProposalType.updateStandardName,
            artefactId: changeProposal.artefactId,
            payload: { oldValue: 'old', newValue: 'payload-value-2' },
            status: ChangeProposalStatus.applied,
            decision: { oldValue: 'old', newValue: 'agreed-value' },
          }) as ChangeProposal<ChangeProposalType.updateStandardName>;

          expect(detectSingleLineConflict(cp1, cp2, diffService)).toEqual(
            false,
          );
        });
      });

      describe('when decision newValues differ', () => {
        it('returns true', () => {
          const cp1 = changeProposalFactory({
            type: ChangeProposalType.updateStandardName,
            artefactId: changeProposal.artefactId,
            payload: { oldValue: 'old', newValue: 'same-payload' },
            status: ChangeProposalStatus.applied,
            decision: { oldValue: 'old', newValue: 'decision-value-1' },
          }) as ChangeProposal<ChangeProposalType.updateStandardName>;

          const cp2 = changeProposalFactory({
            type: ChangeProposalType.updateStandardName,
            artefactId: changeProposal.artefactId,
            payload: { oldValue: 'old', newValue: 'same-payload' },
            status: ChangeProposalStatus.applied,
            decision: { oldValue: 'old', newValue: 'decision-value-2' },
          }) as ChangeProposal<ChangeProposalType.updateStandardName>;

          expect(detectSingleLineConflict(cp1, cp2, diffService)).toEqual(true);
        });
      });
    });

    describe('when only one proposal has decision', () => {
      it('returns false if decision newValue matches the other payload newValue', () => {
        const cpWithDecision = changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          artefactId: changeProposal.artefactId,
          payload: { oldValue: 'old', newValue: 'original-value' },
          status: ChangeProposalStatus.applied,
          decision: { oldValue: 'old', newValue: 'edited-value' },
        }) as ChangeProposal<ChangeProposalType.updateStandardName>;

        const cpWithoutDecision = changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          artefactId: changeProposal.artefactId,
          payload: { oldValue: 'old', newValue: 'edited-value' },
        }) as ChangeProposal<ChangeProposalType.updateStandardName>;

        expect(
          detectSingleLineConflict(
            cpWithDecision,
            cpWithoutDecision,
            diffService,
          ),
        ).toEqual(false);
      });

      it('returns true if decision newValue differs from the other payload newValue', () => {
        const cpWithDecision = changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          artefactId: changeProposal.artefactId,
          payload: { oldValue: 'old', newValue: 'original-value' },
          status: ChangeProposalStatus.applied,
          decision: { oldValue: 'old', newValue: 'edited-value' },
        }) as ChangeProposal<ChangeProposalType.updateStandardName>;

        const cpWithoutDecision = changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          artefactId: changeProposal.artefactId,
          payload: { oldValue: 'old', newValue: 'different-value' },
        }) as ChangeProposal<ChangeProposalType.updateStandardName>;

        expect(
          detectSingleLineConflict(
            cpWithDecision,
            cpWithoutDecision,
            diffService,
          ),
        ).toEqual(true);
      });
    });
  });
});
