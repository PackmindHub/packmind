import { changeProposalFactory } from '../../../../test';
import {
  ChangeProposal,
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
});
