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
import { ruleFactory } from '@packmind/standards/test';
import {
  detectDeleteRuleConflict,
  detectDeleteSkillFileConflict,
  makeDetectSubItemDeleteConflict,
} from './detectSubItemDeleteConflict';
import { skillFileFactory } from '@packmind/skills/test';

describe('detectSubItemDeleteConflict', () => {
  let detectDeleteSubItemConflict: ConflictDetector<ChangeProposalType.deleteRule>;
  let changeProposal: ChangeProposal<ChangeProposalType.deleteRule>;
  let diffService: jest.Mocked<DiffService>;

  const ruleId = createRuleId('rule-id');
  const rule = ruleFactory({ id: ruleId });
  const payload: ChangeProposalPayload<ChangeProposalType.deleteRule> = {
    targetId: ruleId,
    item: rule,
  };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.deleteRule,
      payload,
    }) as ChangeProposal<ChangeProposalType.deleteRule>;
    diffService = {} as jest.Mocked<DiffService>;
    detectDeleteSubItemConflict = makeDetectSubItemDeleteConflict({});
  });

  it('returns false if both proposals have the same id', () => {
    console.log({ changeProposal, diffService });

    expect(
      detectDeleteSubItemConflict(
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
      detectDeleteSubItemConflict(
        changeProposal,
        changeProposalFactory({
          artefactId: createStandardId('another-id'),
        }),
        diffService,
      ),
    ).toBe(false);
  });
});

describe('detectDeleteRuleConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.deleteRule>;
  let diffService: jest.Mocked<DiffService>;

  const ruleId = createRuleId('rule-id');
  const rule = ruleFactory({ id: ruleId });
  const payload: ChangeProposalPayload<ChangeProposalType.deleteRule> = {
    targetId: ruleId,
    item: rule,
  };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.deleteRule,
      payload,
    }) as ChangeProposal<ChangeProposalType.deleteRule>;
    diffService = {} as jest.Mocked<DiffService>;
  });

  describe('when second proposal deletes a rule', () => {
    it('returns true if the second proposal deletes the same rule', () => {
      expect(
        detectDeleteRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: changeProposal.type,
            artefactId: changeProposal.artefactId,
            payload,
          }),
          diffService,
        ),
      ).toBe(true);
    });

    it('returns false if the second proposal deletes another rule', () => {
      const secondRule = ruleFactory();

      expect(
        detectDeleteRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: changeProposal.type,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: secondRule.id,
              item: secondRule,
            },
          }),
          diffService,
        ),
      ).toBe(false);
    });
  });

  describe('when second proposal updates a rule', () => {
    it('returns true if the update is on the same rule', () => {
      expect(
        detectDeleteRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.updateRule,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: payload.targetId,
              oldValue: '',
              newValue: '',
            },
          }),
          diffService,
        ),
      ).toBe(true);
    });

    it('returns false if the update is on another rule', () => {
      expect(
        detectDeleteRuleConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.updateRule,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: createRuleId('another-id'),
              oldValue: '',
              newValue: '',
            },
          }),
          diffService,
        ),
      ).toBe(false);
    });
  });
});

describe('detectDeleteSkillFileConflict', () => {
  let changeProposal: ChangeProposal<ChangeProposalType.deleteSkillFile>;
  let diffService: jest.Mocked<DiffService>;

  const skillFileId = createSkillFileId('skill-file-id');
  const skillFile = skillFileFactory({ id: skillFileId });
  const payload: ChangeProposalPayload<ChangeProposalType.deleteSkillFile> = {
    targetId: skillFileId,
    item: skillFile,
  };

  beforeEach(() => {
    changeProposal = changeProposalFactory({
      type: ChangeProposalType.deleteSkillFile,
      payload,
    }) as ChangeProposal<ChangeProposalType.deleteSkillFile>;
    diffService = {} as jest.Mocked<DiffService>;
  });

  describe('when second proposal deletes a skill file', () => {
    it('returns true if the second proposal deletes the same skill file', () => {
      expect(
        detectDeleteSkillFileConflict(
          changeProposal,
          changeProposalFactory({
            type: changeProposal.type,
            artefactId: changeProposal.artefactId,
            payload,
          }),
          diffService,
        ),
      ).toBe(true);
    });

    it('returns false if the second proposal deletes another rule', () => {
      const secondSkillFile = skillFileFactory();

      expect(
        detectDeleteSkillFileConflict(
          changeProposal,
          changeProposalFactory({
            type: changeProposal.type,
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
  });

  describe('when second proposal updates a skill file content', () => {
    it('returns true if the second proposal targets the same skill file', () => {
      expect(
        detectDeleteSkillFileConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.updateSkillFileContent,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: payload.targetId,
              oldValue: '',
              newValue: '',
            },
          }),
          diffService,
        ),
      ).toBe(true);
    });

    it('returns false if the second proposal targets another skill file', () => {
      expect(
        detectDeleteSkillFileConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.updateSkillFileContent,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: createSkillFileId('another-skill-file-id'),
              oldValue: '',
              newValue: '',
            },
          }),
          diffService,
        ),
      ).toBe(false);
    });
  });

  describe('when second proposal updates a skill file permissions', () => {
    it('returns true if the second proposal targets the same skill file', () => {
      expect(
        detectDeleteSkillFileConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.updateSkillFilePermissions,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: payload.targetId,
              oldValue: '',
              newValue: '',
            },
          }),
          diffService,
        ),
      ).toBe(true);
    });

    it('returns false if the second proposal targets another skill file', () => {
      expect(
        detectDeleteSkillFileConflict(
          changeProposal,
          changeProposalFactory({
            type: ChangeProposalType.updateSkillFilePermissions,
            artefactId: changeProposal.artefactId,
            payload: {
              targetId: createSkillFileId('another-skill-file-id'),
              oldValue: '',
              newValue: '',
            },
          }),
          diffService,
        ),
      ).toBe(false);
    });
  });
});
