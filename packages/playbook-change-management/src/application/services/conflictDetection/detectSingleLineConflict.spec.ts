import { changeProposalFactory } from '../../../../test';
import { detectSingleLineConflict } from './detectSingleLineConflict';
import {
  ChangeProposal,
  ChangeProposalType,
  createStandardId,
} from '@packmind/types';
import { DiffService } from '../DiffService';

describe('singleLineConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.updateStandardName>;
  let diffService: jest.Mocked<DiffService>;

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.updateStandardName,
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

  it('returns true if the two proposals target the same artefact', () => {
    expect(
      detectSingleLineConflict(
        changeProposal,
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: changeProposal.artefactId,
        }),
        diffService,
      ),
    ).toEqual(true);
  });
});
