import { changeProposalFactory } from '../../../../test';
import {
  ChangeProposal,
  ChangeProposalPayload,
  ChangeProposalType,
  createRuleId,
  createStandardId,
} from '@packmind/types';
import { DiffService } from '../DiffService';
import {
  detectAddRuleConflict,
  detectAddSkillFileConflict,
  makeDetectAddSubItemConflict,
} from './detectAddSubItemConflict';
import { ConflictDetector } from './ConflictDetector';

describe('makeDetectAddSubItemConflict', () => {
  let detectAddSubItemConflict: ConflictDetector<ChangeProposalType.addRule>;
  let changeProposal: ChangeProposal<ChangeProposalType.addRule>;
  let diffService: jest.Mocked<DiffService>;

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.addRule,
    }) as ChangeProposal<ChangeProposalType.addRule>;
    diffService = {} as jest.Mocked<DiffService>;
    detectAddSubItemConflict = makeDetectAddSubItemConflict({});
  });

  it('returns false if items have the same id', () => {
    expect(
      detectAddSubItemConflict(
        changeProposal,
        changeProposalFactory({ id: changeProposal.id }),
        diffService,
      ),
    ).toEqual(false);
  });

  it("returns false if items don't have the same type", () => {
    expect(
      detectAddSubItemConflict(
        changeProposal,
        changeProposalFactory({ type: ChangeProposalType.updateCommandName }),
        diffService,
      ),
    ).toEqual(false);
  });

  it("returns false if items don't target the same artefact", () => {
    expect(
      detectAddSubItemConflict(
        changeProposal,
        changeProposalFactory({
          artefactId: createStandardId(`${changeProposal.artefactId}-1`),
        }),
        diffService,
      ),
    ).toEqual(false);
  });
});

describe('detectAddRuleConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.addRule>;
  let diffService: jest.Mocked<DiffService>;

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.addRule,
    }) as ChangeProposal<ChangeProposalType.addRule>;
    diffService = {} as jest.Mocked<DiffService>;
  });

  it('returns false if the two proposals have the same content', () => {
    expect(
      detectAddRuleConflict(
        {
          ...changeProposal,
          payload: {
            item: {
              content: 'My new rule',
            },
          },
        },
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: changeProposal.artefactId,
          payload: {
            item: {
              content: 'My other new rule',
            },
          },
        }),
        diffService,
      ),
    ).toEqual(false);
  });

  it('returns true if the two proposals have the same content', () => {
    const payload = {
      item: {
        content: 'My new rule',
      },
    };

    expect(
      detectAddRuleConflict(
        {
          ...changeProposal,
          payload,
        },
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: changeProposal.artefactId,
          payload,
        }),
        diffService,
      ),
    ).toEqual(true);
  });

  describe('when the second proposal updates a rule', () => {
    const payload = {
      item: {
        content: 'My new rule',
      },
    };

    it('returns false if the second proposal renames a rule with another value', () => {
      expect(
        detectAddRuleConflict(
          {
            ...changeProposal,
            payload,
          },
          changeProposalFactory({
            type: ChangeProposalType.updateRule,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: createRuleId('second-rule'),
              oldValue: 'whatever',
              newValue: 'Something completely different',
            },
          }),
          diffService,
        ),
      ).toEqual(false);
    });

    it('returns true if the second proposal renames a rule with the same name', () => {
      expect(
        detectAddRuleConflict(
          {
            ...changeProposal,
            payload,
          },
          changeProposalFactory({
            type: ChangeProposalType.updateRule,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: createRuleId('second-rule'),
              oldValue: 'whatever',
              newValue: payload.item.content,
            },
          }),
          diffService,
        ),
      ).toEqual(true);
    });
  });
});

describe('detectAddSkillFileConflicts', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.addSkillFile>;
  let diffService: jest.Mocked<DiffService>;

  const payload: ChangeProposalPayload<ChangeProposalType.addSkillFile> = {
    item: {
      content: '',
      path: 'path/to/the/file.pdf',
      permissions: '',
      isBase64: false,
    },
  };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.addSkillFile,
      payload,
    }) as ChangeProposal<ChangeProposalType.addSkillFile>;
    diffService = {} as jest.Mocked<DiffService>;
  });

  it('returns false if the two proposals have different paths', () => {
    expect(
      detectAddSkillFileConflict(
        changeProposal,
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: changeProposal.artefactId,
          payload: {
            item: {
              ...payload.item,
              path: 'some/other/file.pdf',
            },
          },
        }),
        diffService,
      ),
    ).toEqual(false);
  });

  it('returns true if the two proposals have the same path', () => {
    expect(
      detectAddSkillFileConflict(
        changeProposal,
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: changeProposal.artefactId,
          payload,
        }),
        diffService,
      ),
    ).toEqual(true);
  });
});
