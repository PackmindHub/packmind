import {
  ChangeProposal,
  ChangeProposalType,
  createStandardId,
} from '@packmind/types';
import { changeProposalFactory } from '../../../../test';
import { DiffService } from '../DiffService';
import { detectRemoveConflict } from './detectRemoveConflict';

describe('detectRemoveConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.removeStandard>;
  let diffService: jest.Mocked<DiffService>;

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.removeStandard,
      artefactId: createStandardId('some-standard-id'),
    }) as ChangeProposal<ChangeProposalType.removeStandard>;
    diffService = {} as jest.Mocked<DiffService>;
  });

  it('returns false if items have the same id', () => {
    expect(
      detectRemoveConflict(
        changeProposal,
        changeProposalFactory({ id: changeProposal.id }),
        diffService,
      ),
    ).toEqual(false);
  });

  it('returns false if items target different artifacts', () => {
    expect(
      detectRemoveConflict(
        changeProposal,
        changeProposalFactory({
          artefactId: createStandardId('some-other-standard-id'),
        }),
        diffService,
      ),
    ).toEqual(false);
  });

  it('returns true if items target the same artifact', () => {
    expect(
      detectRemoveConflict(
        changeProposal,
        changeProposalFactory({ artefactId: changeProposal.artefactId }),
        diffService,
      ),
    ).toEqual(true);
  });
});
