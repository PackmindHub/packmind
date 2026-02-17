import {
  ChangeProposalType,
  createChangeProposalId,
  createRecipeId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { changeProposalFactory } from '../../../test/changeProposalFactory';
import { DiffService } from './DiffService';
import { ConflictDetectionService } from './ConflictDetectionService';

describe('ConflictDetectionService', () => {
  let service: ConflictDetectionService;
  let diffService: jest.Mocked<DiffService>;

  const recipeId = createRecipeId('recipe-1');
  const spaceId = createSpaceId('space-1');
  const createdBy = createUserId('user-1');

  beforeEach(() => {
    diffService = {
      hasConflict: jest.fn(),
      applyLineDiff: jest.fn(),
    } as unknown as jest.Mocked<DiffService>;

    service = new ConflictDetectionService(diffService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with updateCommandName proposals', () => {
    describe('when multiple proposals update command name', () => {
      const proposal1 = changeProposalFactory({
        id: createChangeProposalId('1'),
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        spaceId,
        payload: { oldValue: 'My command', newValue: 'My super command' },
        createdBy,
      });

      const proposal2 = changeProposalFactory({
        id: createChangeProposalId('2'),
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        spaceId,
        payload: { oldValue: 'My command', newValue: 'My updated command' },
        createdBy,
      });

      it('marks both proposals as conflicting', () => {
        const result = service.detectConflicts([proposal1, proposal2]);

        expect(result[0].conflictsWith).toEqual([proposal2.id]);
      });

      it('marks second proposal as conflicting with first', () => {
        const result = service.detectConflicts([proposal1, proposal2]);

        expect(result[1].conflictsWith).toEqual([proposal1.id]);
      });
    });

    describe('when three proposals update command name', () => {
      const proposal1 = changeProposalFactory({
        id: createChangeProposalId('1'),
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        spaceId,
        payload: { oldValue: 'My command', newValue: 'Version 1' },
        createdBy,
      });

      const proposal2 = changeProposalFactory({
        id: createChangeProposalId('2'),
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        spaceId,
        payload: { oldValue: 'My command', newValue: 'Version 2' },
        createdBy,
      });

      const proposal3 = changeProposalFactory({
        id: createChangeProposalId('3'),
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        spaceId,
        payload: { oldValue: 'My command', newValue: 'Version 3' },
        createdBy,
      });

      it('marks first proposal as conflicting with second and third', () => {
        const result = service.detectConflicts([
          proposal1,
          proposal2,
          proposal3,
        ]);

        expect(result[0].conflictsWith).toEqual([proposal2.id, proposal3.id]);
      });

      it('marks second proposal as conflicting with first and third', () => {
        const result = service.detectConflicts([
          proposal1,
          proposal2,
          proposal3,
        ]);

        expect(result[1].conflictsWith).toEqual([proposal1.id, proposal3.id]);
      });

      it('marks third proposal as conflicting with first and second', () => {
        const result = service.detectConflicts([
          proposal1,
          proposal2,
          proposal3,
        ]);

        expect(result[2].conflictsWith).toEqual([proposal1.id, proposal2.id]);
      });
    });
  });

  describe('with updateCommandDescription proposals', () => {
    const oldValue = `My command:

It has a description.
`;

    describe('when proposals do not conflict', () => {
      const proposal1 = changeProposalFactory({
        id: createChangeProposalId('1'),
        type: ChangeProposalType.updateCommandDescription,
        artefactId: recipeId,
        spaceId,
        payload: {
          oldValue,
          newValue: `My command:

It has a description.

And a new line at the end
`,
        },
        createdBy,
      });

      beforeEach(() => {
        diffService.hasConflict.mockReturnValue(false);
      });

      it('marks proposal as not conflicting', () => {
        const result = service.detectConflicts([proposal1]);

        expect(result[0].conflictsWith).toEqual([]);
      });
    });

    describe('when proposals have different oldValues', () => {
      const proposal1 = changeProposalFactory({
        id: createChangeProposalId('1'),
        type: ChangeProposalType.updateCommandDescription,
        artefactId: recipeId,
        spaceId,
        payload: {
          oldValue: 'Old version 1',
          newValue: 'New version 1',
        },
        createdBy,
      });

      const proposal2 = changeProposalFactory({
        id: createChangeProposalId('2'),
        type: ChangeProposalType.updateCommandDescription,
        artefactId: recipeId,
        spaceId,
        payload: {
          oldValue: 'Old version 2',
          newValue: 'New version 2',
        },
        createdBy,
      });

      it('marks proposals as not conflicting', () => {
        const result = service.detectConflicts([proposal1, proposal2]);

        expect(result[0].conflictsWith).toEqual([]);
      });

      it('marks second proposal as not conflicting', () => {
        const result = service.detectConflicts([proposal1, proposal2]);

        expect(result[1].conflictsWith).toEqual([]);
      });

      it('does not call diffService', () => {
        service.detectConflicts([proposal1, proposal2]);

        expect(diffService.hasConflict).not.toHaveBeenCalled();
      });
    });

    describe('when proposals conflict', () => {
      const proposal1 = changeProposalFactory({
        id: createChangeProposalId('1'),
        type: ChangeProposalType.updateCommandDescription,
        artefactId: recipeId,
        spaceId,
        payload: {
          oldValue,
          newValue: `My updated command:

It has a description.
`,
        },
        createdBy,
      });

      const proposal2 = changeProposalFactory({
        id: createChangeProposalId('2'),
        type: ChangeProposalType.updateCommandDescription,
        artefactId: recipeId,
        spaceId,
        payload: {
          oldValue,
          newValue: `It has a description.`,
        },
        createdBy,
      });

      beforeEach(() => {
        diffService.hasConflict.mockReturnValue(true);
      });

      it('marks first proposal as conflicting with second', () => {
        const result = service.detectConflicts([proposal1, proposal2]);

        expect(result[0].conflictsWith).toEqual([proposal2.id]);
      });

      it('marks second proposal as conflicting with first', () => {
        const result = service.detectConflicts([proposal1, proposal2]);

        expect(result[1].conflictsWith).toEqual([proposal1.id]);
      });

      it('calls diffService for first proposal', () => {
        service.detectConflicts([proposal1, proposal2]);

        expect(diffService.hasConflict).toHaveBeenCalledWith(
          oldValue,
          proposal1.payload.newValue,
          proposal2.payload.newValue,
        );
      });

      it('calls diffService for second proposal', () => {
        service.detectConflicts([proposal1, proposal2]);

        expect(diffService.hasConflict).toHaveBeenCalledWith(
          oldValue,
          proposal2.payload.newValue,
          proposal1.payload.newValue,
        );
      });
    });
  });

  describe('with mixed proposal types', () => {
    const oldValue = `My command:

It has a description.
`;

    const nameProposal1 = changeProposalFactory({
      id: createChangeProposalId('1'),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
      payload: { oldValue: 'My command', newValue: 'My super command' },
      createdBy,
    });

    const nameProposal2 = changeProposalFactory({
      id: createChangeProposalId('2'),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
      payload: { oldValue: 'My command', newValue: 'My updated command' },
      createdBy,
    });

    const descProposal = changeProposalFactory({
      id: createChangeProposalId('3'),
      type: ChangeProposalType.updateCommandDescription,
      artefactId: recipeId,
      spaceId,
      payload: {
        oldValue,
        newValue: `My command:

It has a description.

And a new line at the end
`,
      },
      createdBy,
    });

    beforeEach(() => {
      diffService.hasConflict.mockReturnValue(false);
    });

    it('marks name proposals as conflicting with each other', () => {
      const result = service.detectConflicts([
        nameProposal1,
        nameProposal2,
        descProposal,
      ]);

      expect(result[0].conflictsWith).toEqual([nameProposal2.id]);
    });

    it('marks second name proposal as conflicting with first', () => {
      const result = service.detectConflicts([
        nameProposal1,
        nameProposal2,
        descProposal,
      ]);

      expect(result[1].conflictsWith).toEqual([nameProposal1.id]);
    });

    it('marks description proposal as not conflicting', () => {
      const result = service.detectConflicts([
        nameProposal1,
        nameProposal2,
        descProposal,
      ]);

      expect(result[2].conflictsWith).toEqual([]);
    });
  });

  describe('with non-supported proposal types', () => {
    const standardProposal = changeProposalFactory({
      id: createChangeProposalId('1'),
      type: ChangeProposalType.updateStandardName,
      artefactId: recipeId,
      spaceId,
      payload: { oldValue: 'Old Name', newValue: 'New Name' },
      createdBy,
    });

    it('marks proposal as not conflicting', () => {
      const result = service.detectConflicts([standardProposal]);

      expect(result[0].conflictsWith).toEqual([]);
    });

    it('does not call diffService', () => {
      service.detectConflicts([standardProposal]);

      expect(diffService.hasConflict).not.toHaveBeenCalled();
    });
  });

  describe('with empty proposals array', () => {
    it('returns empty array', () => {
      const result = service.detectConflicts([]);

      expect(result).toEqual([]);
    });
  });

  describe('with single proposal', () => {
    const proposal = changeProposalFactory({
      id: createChangeProposalId('1'),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
      payload: { oldValue: 'My command', newValue: 'My super command' },
      createdBy,
    });

    it('marks proposal as not conflicting', () => {
      const result = service.detectConflicts([proposal]);

      expect(result[0].conflictsWith).toEqual([]);
    });
  });
});
