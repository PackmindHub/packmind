import { changeProposalFactory } from '../../../../test';
import { detectSingleLineConflict } from './detectSingleLineConflict';
import {
  ChangeProposal,
  ChangeProposalPayload,
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
});
