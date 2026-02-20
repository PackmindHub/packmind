import { ConflictDetector } from './ConflictDetector';
import {
  ChangeProposal,
  ChangeProposalPayload,
  ChangeProposalType,
  createRuleId,
  createSkillFileId,
  createStandardId,
} from '@packmind/types';
import { DiffService } from '../DiffService';
import { changeProposalFactory } from '../../../../test';
import {
  detectUpdateRuleConflict,
  detectUpdateSkillFileContentConflict,
  detectUpdateSkillPermissionsContentConflict,
  makeDetectUpdateSubItemConflict,
} from './detectUpdateSubItemConflict';
import { ruleFactory } from '@packmind/standards/test';
import { skillFileFactory } from '@packmind/skills/test';

describe('detectUpdateSubItemConflict', () => {
  let detectAddSubItemConflict: ConflictDetector<ChangeProposalType.updateRule>;
  let changeProposal: ChangeProposal<ChangeProposalType.updateRule>;
  let diffService: jest.Mocked<DiffService>;

  const ruleId = createRuleId('rule-id');
  const payload: ChangeProposalPayload<ChangeProposalType.updateRule> = {
    targetId: ruleId,
    newValue: 'The old rule',
    oldValue: 'The new rule',
  };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.updateRule,
      payload,
    }) as ChangeProposal<ChangeProposalType.updateRule>;
    diffService = {} as jest.Mocked<DiffService>;
    detectAddSubItemConflict = makeDetectUpdateSubItemConflict({});
  });

  it('returns false if both proposals have the same id', () => {
    console.log({ changeProposal, diffService });

    expect(
      detectAddSubItemConflict(
        changeProposal,
        changeProposalFactory({
          id: changeProposal.id,
        }),
        diffService,
      ),
    ).toBe(false);
  });

  it('returns false if both proposals do not target the same artefact', () => {
    expect(
      detectAddSubItemConflict(
        changeProposal,
        changeProposalFactory({
          artefactId: createStandardId('another-id'),
        }),
        diffService,
      ),
    ).toBe(false);
  });

  it('returns false if second proposal has the same type but targets another sub item', () => {
    expect(
      detectUpdateRuleConflict(
        changeProposal,
        changeProposalFactory({
          type: changeProposal.type,
          artefactId: changeProposal.artefactId,
          payload: {
            targetId: createRuleId('another-rule-id'),
            oldValue: 'whatever',
            newValue: 'some new value',
          },
        }),
        diffService,
      ),
    ).toBe(false);
  });
});

describe('detectUpdateRuleConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.updateRule>;
  let diffService: jest.Mocked<DiffService>;
  const ruleId = createRuleId('rule-id');
  const payload: ChangeProposalPayload<ChangeProposalType.updateRule> = {
    targetId: ruleId,
    newValue: 'The old rule',
    oldValue: 'The new rule',
  };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.updateRule,
      payload,
    }) as ChangeProposal<ChangeProposalType.updateRule>;
    diffService = {} as jest.Mocked<DiffService>;
  });

  describe('when the second proposal also update a rule', () => {
    let changeProposal2: ChangeProposal<ChangeProposalType.updateRule>;

    beforeEach(() => {
      changeProposal2 = changeProposalFactory({
        type: ChangeProposalType.updateRule,
        artefactId: changeProposal.artefactId,
      }) as ChangeProposal<ChangeProposalType.updateRule>;
    });

    it('returns false if second proposal targets the same rule with the same content', () => {
      expect(
        detectUpdateRuleConflict(
          changeProposal,
          {
            ...changeProposal2,
            payload,
          },
          diffService,
        ),
      ).toBe(false);
    });

    it('returns true if second proposal targets the same rule with the another content', () => {
      expect(
        detectUpdateRuleConflict(
          changeProposal,
          {
            ...changeProposal2,
            payload: {
              ...payload,
              newValue: 'Some brand new content',
            },
          },
          diffService,
        ),
      ).toBe(true);
    });
  });

  describe('when second proposal adds a rule', () => {
    it('returns false if added rule has a different content', () => {
      expect(
        detectUpdateRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.addRule,
            artefactId: changeProposal.artefactId,
            payload: {
              item: {
                content: 'Some brand new value',
              },
            },
          }),
          diffService,
        ),
      ).toBe(false);
    });

    it('returns true if added rule has the same content', () => {
      expect(
        detectUpdateRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.addRule,
            artefactId: changeProposal.artefactId,
            payload: {
              item: {
                content: payload.newValue,
              },
            },
          }),
          diffService,
        ),
      ).toBe(true);
    });
  });

  describe('when second proposal removes a rule', () => {
    it('returns false if another rule is deleted', () => {
      const secondRule = ruleFactory();
      expect(
        detectUpdateRuleConflict(
          changeProposal,
          changeProposalFactory({
            artefactId: changeProposal.artefactId,
            type: ChangeProposalType.deleteRule,
            payload: {
              targetId: secondRule.id,
              item: secondRule,
            },
          }),
          diffService,
        ),
      ).toBe(false);
    });

    it('returns true if the same rule is deleted', () => {
      expect(
        detectUpdateRuleConflict(
          changeProposal,
          changeProposalFactory({
            artefactId: changeProposal.artefactId,
            type: ChangeProposalType.deleteRule,
            payload: {
              targetId: changeProposal.payload.targetId,
              item: ruleFactory({ id: changeProposal.payload.targetId }),
            },
          }),
          diffService,
        ),
      ).toBe(true);
    });
  });
});

describe('detectUpdateSkillFileContentConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.updateSkillFileContent>;
  let diffService: jest.Mocked<DiffService>;
  const skillFileId = createSkillFileId('skill-file-id');
  const payload: ChangeProposalPayload<ChangeProposalType.updateSkillFileContent> =
    {
      targetId: skillFileId,
      newValue: 'The old content',
      oldValue: 'ome new content',
    };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillFileContent,
      payload,
    }) as ChangeProposal<ChangeProposalType.updateSkillFileContent>;
    diffService = {
      hasConflict: jest.fn(),
      applyLineDiff: jest.fn(),
    };
  });

  describe('when second proposal is also a updateSkillFileContent', () => {
    let result: boolean;

    describe('when change proposal is base64', () => {
      it('returns true', () => {
        expect(
          detectUpdateSkillFileContentConflict(
            changeProposal,
            changeProposalFactory({
              type: changeProposal.type,
              artefactId: changeProposal.artefactId,
              payload: {
                ...payload,
                isBase64: true,
              },
            }),
            diffService,
          ),
        ).toBe(true);
      });
    });

    describe('when change proposal is not base64', () => {
      beforeEach(() => {
        diffService.hasConflict.mockReturnValue(true);

        result = detectUpdateSkillFileContentConflict(
          changeProposal,
          changeProposalFactory({
            type: changeProposal.type,
            artefactId: changeProposal.artefactId,
            payload: {
              ...payload,
              newValue: 'Some brand new value',
            },
          }),
          diffService,
        );
      });

      it('uses the diff service to check for conflicts', () => {
        expect(diffService.hasConflict).toHaveBeenCalledWith(
          payload.oldValue,
          payload.newValue,
          'Some brand new value',
        );
      });

      it('returns the results from the diffService', () => {
        expect(result).toBe(true);
      });
    });
  });

  describe('when the second proposal is a deleteSkillFile', () => {
    it('returns false if the deleted file is not the same file', () => {
      const secondSkillFile = skillFileFactory();

      expect(
        detectUpdateSkillFileContentConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.deleteSkillFile,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: secondSkillFile.id,
              item: secondSkillFile,
            },
          }),
          diffService,
        ),
      ).toBe(false);
    });

    it('returns true if the deleted file is the same file', () => {
      expect(
        detectUpdateSkillFileContentConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.deleteSkillFile,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: skillFileId,
              item: skillFileFactory({ id: skillFileId }),
            },
          }),
          diffService,
        ),
      ).toBe(true);
    });
  });
});

describe('detectUpdateSkillFilePermissionsConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.updateSkillFilePermissions>;
  let diffService: jest.Mocked<DiffService>;
  const skillFileId = createSkillFileId('skill-file-id');
  const payload: ChangeProposalPayload<ChangeProposalType.updateSkillFilePermissions> =
    {
      targetId: skillFileId,
      newValue: '0755',
      oldValue: '0700',
    };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillFilePermissions,
      payload,
    }) as ChangeProposal<ChangeProposalType.updateSkillFilePermissions>;
    diffService = {} as jest.Mocked<DiffService>;
  });

  describe('when the second proposal is also a updateSkillFilePermissions', () => {
    it('return false if the new value is the same', () => {
      expect(
        detectUpdateSkillPermissionsContentConflict(
          changeProposal,
          changeProposalFactory({
            type: changeProposal.type,
            artefactId: changeProposal.artefactId,
            payload,
          }),
          diffService,
        ),
      );
    });

    it('return true if the new value is different', () => {
      expect(
        detectUpdateSkillPermissionsContentConflict(
          changeProposal,
          changeProposalFactory({
            type: changeProposal.type,
            artefactId: changeProposal.artefactId,
            payload: {
              ...payload,
              newValue: '12345',
            },
          }),
          diffService,
        ),
      );
    });
  });

  describe('when second proposal is a deleteSkillFile', () => {
    it('returns false if deleted file is another skill file', () => {
      const seconFile = skillFileFactory();
      expect(
        detectUpdateSkillPermissionsContentConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.deleteSkillFile,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: seconFile.id,
              item: seconFile,
            },
          }),
          diffService,
        ),
      ).toBe(false);
    });

    it('returns true if deleted file is the same file', () => {
      expect(
        detectUpdateSkillPermissionsContentConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.deleteSkillFile,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: payload.targetId,
              item: skillFileFactory({ id: payload.targetId }),
            },
          }),
          diffService,
        ),
      ).toBe(true);
    });
  });
});
