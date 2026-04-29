import {
  ChangeProposal,
  ChangeProposalStatus,
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

  describe('when both item target the same artifact', () => {
    it('returns false if the decision is to remove from package', () => {
      expect(
        detectRemoveConflict(
          {
            ...changeProposal,
            status: ChangeProposalStatus.applied,
            decision: {
              delete: false,
              removeFromPackages: [],
            },
          },
          changeProposalFactory({ artefactId: changeProposal.artefactId }),
          diffService,
        ),
      ).toEqual(false);
    });

    it('returns true if the decision is to delete the artefact', () => {
      expect(
        detectRemoveConflict(
          {
            ...changeProposal,
            status: ChangeProposalStatus.applied,
            decision: {
              delete: true,
            },
          },
          changeProposalFactory({ artefactId: changeProposal.artefactId }),
          diffService,
        ),
      ).toEqual(true);
    });
  });
});
