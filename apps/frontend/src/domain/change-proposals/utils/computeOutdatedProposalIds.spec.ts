import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalId,
  ChangeProposalStatus,
  ChangeProposalType,
  Recipe,
  Rule,
  Skill,
  SkillFile,
  Standard,
} from '@packmind/types';

import {
  computeSkillOutdatedIds,
  computeStandardOutdatedIds,
  computeCommandOutdatedIds,
} from './computeOutdatedProposalIds';

// ---------------------------------------------------------------------------
// Helpers – factory functions to reduce boilerplate
// ---------------------------------------------------------------------------

let idCounter = 0;

function nextId(prefix = 'id'): string {
  return `${prefix}-${++idCounter}`;
}

function makeProposal(
  overrides: Partial<ChangeProposal> & {
    type: ChangeProposalType;
    payload: unknown;
  },
): ChangeProposal {
  return {
    id: nextId('proposal') as ChangeProposalId,
    artefactId: nextId('artefact') as never,
    artefactVersion: 1,
    spaceId: 'space-1' as never,
    captureMode: ChangeProposalCaptureMode.commit,
    status: ChangeProposalStatus.pending,
    createdBy: 'user-1' as never,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ChangeProposal;
}

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'skill-1' as never,
    spaceId: 'space-1' as never,
    userId: 'user-1' as never,
    name: 'My Skill',
    slug: 'my-skill',
    version: 2,
    description: 'A description',
    prompt: 'A prompt',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSkillFile(overrides: Partial<SkillFile> = {}): SkillFile {
  return {
    id: 'file-1' as never,
    skillVersionId: 'sv-1' as never,
    path: 'src/index.ts',
    content: 'console.log("hello")',
    permissions: '755',
    isBase64: false,
    ...overrides,
  };
}

function makeStandard(overrides: Partial<Standard> = {}): Standard {
  return {
    id: 'std-1' as never,
    name: 'My Standard',
    slug: 'my-standard',
    description: 'A description',
    version: 2,
    userId: 'user-1' as never,
    scope: 'all files',
    spaceId: 'space-1' as never,
    ...overrides,
  };
}

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-1' as never,
    content: 'Always use const',
    standardVersionId: 'sv-1' as never,
    ...overrides,
  };
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1' as never,
    name: 'My Command',
    slug: 'my-command',
    content: 'Step 1: do this',
    version: 2,
    userId: 'user-1' as never,
    spaceId: 'space-1' as never,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  idCounter = 0;
});

describe('computeSkillOutdatedIds', () => {
  describe('when skill is undefined', () => {
    it('returns an empty set', () => {
      const result = computeSkillOutdatedIds([], undefined, []);
      expect(result.size).toBe(0);
    });
  });

  describe('same artefact version (optimization short-circuit)', () => {
    it('never marks proposal as outdated regardless of payload mismatch', () => {
      const skill = makeSkill({ version: 5 });
      const proposal = makeProposal({
        type: ChangeProposalType.updateSkillName,
        artefactVersion: 5,
        payload: { oldValue: 'WRONG', newValue: 'something' },
      });

      const result = computeSkillOutdatedIds([proposal], skill, []);
      expect(result.size).toBe(0);
    });
  });

  describe('scalar updates', () => {
    const scalarCases: {
      label: string;
      type: ChangeProposalType;
      field: keyof Skill;
      currentValue: string;
    }[] = [
      {
        label: 'updateSkillName',
        type: ChangeProposalType.updateSkillName,
        field: 'name',
        currentValue: 'My Skill',
      },
      {
        label: 'updateSkillDescription',
        type: ChangeProposalType.updateSkillDescription,
        field: 'description',
        currentValue: 'A description',
      },
      {
        label: 'updateSkillPrompt',
        type: ChangeProposalType.updateSkillPrompt,
        field: 'prompt',
        currentValue: 'A prompt',
      },
      {
        label: 'updateSkillLicense',
        type: ChangeProposalType.updateSkillLicense,
        field: 'license',
        currentValue: 'MIT',
      },
      {
        label: 'updateSkillCompatibility',
        type: ChangeProposalType.updateSkillCompatibility,
        field: 'compatibility',
        currentValue: 'Node 18+',
      },
      {
        label: 'updateSkillAllowedTools',
        type: ChangeProposalType.updateSkillAllowedTools,
        field: 'allowedTools',
        currentValue: 'Bash,Read',
      },
    ];

    describe.each(scalarCases)('$label', ({ type, field, currentValue }) => {
      describe('when oldValue matches current value', () => {
        it('is NOT outdated', () => {
          const skill = makeSkill({ [field]: currentValue });
          const proposal = makeProposal({
            type,
            artefactVersion: 1,
            payload: { oldValue: currentValue, newValue: 'new' },
          });

          const result = computeSkillOutdatedIds([proposal], skill, []);
          expect(result.size).toBe(0);
        });
      });

      describe('when oldValue does not match current value', () => {
        it('IS outdated', () => {
          const skill = makeSkill({ [field]: currentValue });
          const proposal = makeProposal({
            type,
            artefactVersion: 1,
            payload: { oldValue: 'MISMATCHED', newValue: 'new' },
          });

          const result = computeSkillOutdatedIds([proposal], skill, []);
          expect(result.has(proposal.id)).toBe(true);
        });
      });
    });

    describe('updateSkillMetadata', () => {
      describe('when oldValue matches serialized metadata', () => {
        it('is NOT outdated', () => {
          const metadata = { bar: 'b', foo: 'a' };
          const skill = makeSkill({ metadata });
          // Serialized with sorted keys: {"bar":"b","foo":"a"}
          const serialized = JSON.stringify({ bar: 'b', foo: 'a' });

          const proposal = makeProposal({
            type: ChangeProposalType.updateSkillMetadata,
            artefactVersion: 1,
            payload: { oldValue: serialized, newValue: '{}' },
          });

          const result = computeSkillOutdatedIds([proposal], skill, []);
          expect(result.size).toBe(0);
        });
      });

      describe('when oldValue does not match serialized metadata', () => {
        it('IS outdated', () => {
          const skill = makeSkill({ metadata: { foo: 'a' } });

          const proposal = makeProposal({
            type: ChangeProposalType.updateSkillMetadata,
            artefactVersion: 1,
            payload: { oldValue: '{"foo":"WRONG"}', newValue: '{}' },
          });

          const result = computeSkillOutdatedIds([proposal], skill, []);
          expect(result.has(proposal.id)).toBe(true);
        });
      });

      it('serializes metadata with sorted keys for deterministic comparison', () => {
        // Keys inserted in reverse order should still serialize identically
        const skill = makeSkill({ metadata: { zebra: 'z', apple: 'a' } });
        const sortedSerialized = JSON.stringify({ apple: 'a', zebra: 'z' });

        const proposal = makeProposal({
          type: ChangeProposalType.updateSkillMetadata,
          artefactVersion: 1,
          payload: { oldValue: sortedSerialized, newValue: '{}' },
        });

        const result = computeSkillOutdatedIds([proposal], skill, []);
        expect(result.size).toBe(0);
      });

      describe('when metadata is undefined', () => {
        it('uses "{}"', () => {
          const skill = makeSkill({ metadata: undefined });

          const proposal = makeProposal({
            type: ChangeProposalType.updateSkillMetadata,
            artefactVersion: 1,
            payload: { oldValue: '{}', newValue: '{"a":"1"}' },
          });

          const result = computeSkillOutdatedIds([proposal], skill, []);
          expect(result.size).toBe(0);
        });
      });
    });

    describe('optional fields default to empty string', () => {
      it('uses empty string for undefined license', () => {
        const skill = makeSkill({ license: undefined });

        const proposal = makeProposal({
          type: ChangeProposalType.updateSkillLicense,
          artefactVersion: 1,
          payload: { oldValue: '', newValue: 'MIT' },
        });

        const result = computeSkillOutdatedIds([proposal], skill, []);
        expect(result.size).toBe(0);
      });

      it('uses empty string for undefined compatibility', () => {
        const skill = makeSkill({ compatibility: undefined });

        const proposal = makeProposal({
          type: ChangeProposalType.updateSkillCompatibility,
          artefactVersion: 1,
          payload: { oldValue: '', newValue: 'Node 18+' },
        });

        const result = computeSkillOutdatedIds([proposal], skill, []);
        expect(result.size).toBe(0);
      });

      it('uses empty string for undefined allowedTools', () => {
        const skill = makeSkill({ allowedTools: undefined });

        const proposal = makeProposal({
          type: ChangeProposalType.updateSkillAllowedTools,
          artefactVersion: 1,
          payload: { oldValue: '', newValue: 'Bash' },
        });

        const result = computeSkillOutdatedIds([proposal], skill, []);
        expect(result.size).toBe(0);
      });
    });
  });

  describe('collection update – updateSkillFileContent', () => {
    describe('when oldValue matches current file content', () => {
      it('is NOT outdated', () => {
        const file = makeSkillFile({ content: 'current content' });
        const skill = makeSkill();
        const proposal = makeProposal({
          type: ChangeProposalType.updateSkillFileContent,
          artefactVersion: 1,
          payload: {
            targetId: file.id,
            oldValue: 'current content',
            newValue: 'new content',
          },
        });

        const result = computeSkillOutdatedIds([proposal], skill, [file]);
        expect(result.size).toBe(0);
      });
    });

    describe('when oldValue does not match current file content', () => {
      it('IS outdated', () => {
        const file = makeSkillFile({ content: 'current content' });
        const skill = makeSkill();
        const proposal = makeProposal({
          type: ChangeProposalType.updateSkillFileContent,
          artefactVersion: 1,
          payload: {
            targetId: file.id,
            oldValue: 'STALE content',
            newValue: 'new content',
          },
        });

        const result = computeSkillOutdatedIds([proposal], skill, [file]);
        expect(result.has(proposal.id)).toBe(true);
      });
    });

    describe('when the target file no longer exists', () => {
      it('IS outdated', () => {
        const skill = makeSkill();
        const proposal = makeProposal({
          type: ChangeProposalType.updateSkillFileContent,
          artefactVersion: 1,
          payload: {
            targetId: 'file-missing' as never,
            oldValue: 'anything',
            newValue: 'new',
          },
        });

        const result = computeSkillOutdatedIds([proposal], skill, []);
        expect(result.has(proposal.id)).toBe(true);
      });
    });
  });

  describe('collection update – updateSkillFilePermissions', () => {
    describe('when oldValue matches current permissions', () => {
      it('is NOT outdated', () => {
        const file = makeSkillFile({ permissions: '755' });
        const skill = makeSkill();
        const proposal = makeProposal({
          type: ChangeProposalType.updateSkillFilePermissions,
          artefactVersion: 1,
          payload: {
            targetId: file.id,
            oldValue: '755',
            newValue: '644',
          },
        });

        const result = computeSkillOutdatedIds([proposal], skill, [file]);
        expect(result.size).toBe(0);
      });
    });

    describe('when oldValue does not match current permissions', () => {
      it('IS outdated', () => {
        const file = makeSkillFile({ permissions: '755' });
        const skill = makeSkill();
        const proposal = makeProposal({
          type: ChangeProposalType.updateSkillFilePermissions,
          artefactVersion: 1,
          payload: {
            targetId: file.id,
            oldValue: '644',
            newValue: '700',
          },
        });

        const result = computeSkillOutdatedIds([proposal], skill, [file]);
        expect(result.has(proposal.id)).toBe(true);
      });
    });

    describe('when the target file no longer exists', () => {
      it('IS outdated', () => {
        const skill = makeSkill();
        const proposal = makeProposal({
          type: ChangeProposalType.updateSkillFilePermissions,
          artefactVersion: 1,
          payload: {
            targetId: 'file-missing' as never,
            oldValue: '755',
            newValue: '644',
          },
        });

        const result = computeSkillOutdatedIds([proposal], skill, []);
        expect(result.has(proposal.id)).toBe(true);
      });
    });
  });

  describe('collection add – addSkillFile', () => {
    it('is never outdated', () => {
      const skill = makeSkill();
      const proposal = makeProposal({
        type: ChangeProposalType.addSkillFile,
        artefactVersion: 1,
        payload: {
          item: {
            path: 'src/new.ts',
            content: 'new file',
            permissions: '644',
            isBase64: false,
          },
        },
      });

      const result = computeSkillOutdatedIds([proposal], skill, []);
      expect(result.size).toBe(0);
    });
  });

  describe('collection delete – deleteSkillFile', () => {
    describe('when file exists and content matches snapshot', () => {
      it('is NOT outdated', () => {
        const file = makeSkillFile({ content: 'original content' });
        const skill = makeSkill();
        const proposal = makeProposal({
          type: ChangeProposalType.deleteSkillFile,
          artefactVersion: 1,
          payload: {
            targetId: file.id,
            item: {
              id: file.id,
              path: file.path,
              content: 'original content',
              permissions: file.permissions,
              isBase64: file.isBase64,
            },
          },
        });

        const result = computeSkillOutdatedIds([proposal], skill, [file]);
        expect(result.size).toBe(0);
      });
    });

    describe('when file content has changed since snapshot', () => {
      it('IS outdated', () => {
        const file = makeSkillFile({ content: 'UPDATED content' });
        const skill = makeSkill();
        const proposal = makeProposal({
          type: ChangeProposalType.deleteSkillFile,
          artefactVersion: 1,
          payload: {
            targetId: file.id,
            item: {
              id: file.id,
              path: file.path,
              content: 'original content',
              permissions: file.permissions,
              isBase64: file.isBase64,
            },
          },
        });

        const result = computeSkillOutdatedIds([proposal], skill, [file]);
        expect(result.has(proposal.id)).toBe(true);
      });
    });

    describe('when the target file no longer exists', () => {
      it('IS outdated', () => {
        const skill = makeSkill();
        const proposal = makeProposal({
          type: ChangeProposalType.deleteSkillFile,
          artefactVersion: 1,
          payload: {
            targetId: 'file-gone' as never,
            item: {
              id: 'file-gone',
              path: 'src/gone.ts',
              content: 'old',
              permissions: '755',
              isBase64: false,
            },
          },
        });

        const result = computeSkillOutdatedIds([proposal], skill, []);
        expect(result.has(proposal.id)).toBe(true);
      });
    });
  });

  describe('multiple proposals', () => {
    let result: Set<ChangeProposalId>;
    let fresh: ChangeProposal;
    let stale: ChangeProposal;

    beforeEach(() => {
      const skill = makeSkill({
        name: 'Current Name',
        description: 'Current Desc',
      });
      fresh = makeProposal({
        type: ChangeProposalType.updateSkillName,
        artefactVersion: 1,
        payload: { oldValue: 'Current Name', newValue: 'New Name' },
      });
      stale = makeProposal({
        type: ChangeProposalType.updateSkillDescription,
        artefactVersion: 1,
        payload: { oldValue: 'OLD Desc', newValue: 'New Desc' },
      });

      result = computeSkillOutdatedIds([fresh, stale], skill, []);
    });

    it('contains exactly one outdated proposal', () => {
      expect(result.size).toBe(1);
    });

    it('includes the stale proposal', () => {
      expect(result.has(stale.id)).toBe(true);
    });

    it('excludes the fresh proposal', () => {
      expect(result.has(fresh.id)).toBe(false);
    });
  });
});

describe('computeStandardOutdatedIds', () => {
  describe('when standard is undefined', () => {
    it('returns an empty set', () => {
      const result = computeStandardOutdatedIds([], undefined, []);
      expect(result.size).toBe(0);
    });
  });

  describe('same artefact version (optimization short-circuit)', () => {
    it('never marks proposal as outdated regardless of payload mismatch', () => {
      const standard = makeStandard({ version: 3 });
      const proposal = makeProposal({
        type: ChangeProposalType.updateStandardName,
        artefactVersion: 3,
        payload: { oldValue: 'WRONG', newValue: 'new' },
      });

      const result = computeStandardOutdatedIds([proposal], standard, []);
      expect(result.size).toBe(0);
    });
  });

  describe('scalar updates', () => {
    const scalarCases: {
      label: string;
      type: ChangeProposalType;
      field: keyof Standard;
      currentValue: string;
    }[] = [
      {
        label: 'updateStandardName',
        type: ChangeProposalType.updateStandardName,
        field: 'name',
        currentValue: 'My Standard',
      },
      {
        label: 'updateStandardDescription',
        type: ChangeProposalType.updateStandardDescription,
        field: 'description',
        currentValue: 'A description',
      },
      {
        label: 'updateStandardScope',
        type: ChangeProposalType.updateStandardScope,
        field: 'scope',
        currentValue: 'all files',
      },
    ];

    describe.each(scalarCases)('$label', ({ type, field, currentValue }) => {
      describe('when oldValue matches current value', () => {
        it('is NOT outdated', () => {
          const standard = makeStandard({ [field]: currentValue });
          const proposal = makeProposal({
            type,
            artefactVersion: 1,
            payload: { oldValue: currentValue, newValue: 'new' },
          });

          const result = computeStandardOutdatedIds([proposal], standard, []);
          expect(result.size).toBe(0);
        });
      });

      describe('when oldValue does not match current value', () => {
        it('IS outdated', () => {
          const standard = makeStandard({ [field]: currentValue });
          const proposal = makeProposal({
            type,
            artefactVersion: 1,
            payload: { oldValue: 'MISMATCHED', newValue: 'new' },
          });

          const result = computeStandardOutdatedIds([proposal], standard, []);
          expect(result.has(proposal.id)).toBe(true);
        });
      });
    });

    describe('optional scope defaults to empty string', () => {
      it('uses empty string for null scope', () => {
        const standard = makeStandard({ scope: null });

        const proposal = makeProposal({
          type: ChangeProposalType.updateStandardScope,
          artefactVersion: 1,
          payload: { oldValue: '', newValue: 'new scope' },
        });

        const result = computeStandardOutdatedIds([proposal], standard, []);
        expect(result.size).toBe(0);
      });
    });
  });

  describe('collection update – updateRule', () => {
    describe('when oldValue matches current rule content', () => {
      it('is NOT outdated', () => {
        const rule = makeRule({ content: 'Always use const' });
        const standard = makeStandard();
        const proposal = makeProposal({
          type: ChangeProposalType.updateRule,
          artefactVersion: 1,
          payload: {
            targetId: rule.id,
            oldValue: 'Always use const',
            newValue: 'Always use let',
          },
        });

        const result = computeStandardOutdatedIds([proposal], standard, [rule]);
        expect(result.size).toBe(0);
      });
    });

    describe('when oldValue does not match current rule content', () => {
      it('IS outdated', () => {
        const rule = makeRule({ content: 'Always use const' });
        const standard = makeStandard();
        const proposal = makeProposal({
          type: ChangeProposalType.updateRule,
          artefactVersion: 1,
          payload: {
            targetId: rule.id,
            oldValue: 'STALE content',
            newValue: 'new content',
          },
        });

        const result = computeStandardOutdatedIds([proposal], standard, [rule]);
        expect(result.has(proposal.id)).toBe(true);
      });
    });

    describe('when the target rule no longer exists', () => {
      it('IS outdated', () => {
        const standard = makeStandard();
        const proposal = makeProposal({
          type: ChangeProposalType.updateRule,
          artefactVersion: 1,
          payload: {
            targetId: 'rule-missing' as never,
            oldValue: 'anything',
            newValue: 'new',
          },
        });

        const result = computeStandardOutdatedIds([proposal], standard, []);
        expect(result.has(proposal.id)).toBe(true);
      });
    });
  });

  describe('collection add – addRule', () => {
    it('is never outdated', () => {
      const standard = makeStandard();
      const proposal = makeProposal({
        type: ChangeProposalType.addRule,
        artefactVersion: 1,
        payload: {
          item: { content: 'new rule' },
        },
      });

      const result = computeStandardOutdatedIds([proposal], standard, []);
      expect(result.size).toBe(0);
    });
  });

  describe('collection delete – deleteRule', () => {
    describe('when rule exists and content matches snapshot', () => {
      it('is NOT outdated', () => {
        const rule = makeRule({ content: 'original' });
        const standard = makeStandard();
        const proposal = makeProposal({
          type: ChangeProposalType.deleteRule,
          artefactVersion: 1,
          payload: {
            targetId: rule.id,
            item: { id: rule.id, content: 'original' },
          },
        });

        const result = computeStandardOutdatedIds([proposal], standard, [rule]);
        expect(result.size).toBe(0);
      });
    });

    describe('when rule content has changed since snapshot', () => {
      it('IS outdated', () => {
        const rule = makeRule({ content: 'UPDATED' });
        const standard = makeStandard();
        const proposal = makeProposal({
          type: ChangeProposalType.deleteRule,
          artefactVersion: 1,
          payload: {
            targetId: rule.id,
            item: { id: rule.id, content: 'original' },
          },
        });

        const result = computeStandardOutdatedIds([proposal], standard, [rule]);
        expect(result.has(proposal.id)).toBe(true);
      });
    });

    describe('when the target rule no longer exists', () => {
      it('IS outdated', () => {
        const standard = makeStandard();
        const proposal = makeProposal({
          type: ChangeProposalType.deleteRule,
          artefactVersion: 1,
          payload: {
            targetId: 'rule-gone' as never,
            item: { id: 'rule-gone', content: 'old' },
          },
        });

        const result = computeStandardOutdatedIds([proposal], standard, []);
        expect(result.has(proposal.id)).toBe(true);
      });
    });
  });

  describe('multiple proposals', () => {
    let result: Set<ChangeProposalId>;
    let fresh: ChangeProposal;
    let stale: ChangeProposal;
    let addProposal: ChangeProposal;

    beforeEach(() => {
      const standard = makeStandard({
        name: 'Current Name',
        description: 'Current Desc',
      });
      const rule = makeRule({ content: 'Current Rule' });

      fresh = makeProposal({
        type: ChangeProposalType.updateStandardName,
        artefactVersion: 1,
        payload: { oldValue: 'Current Name', newValue: 'New' },
      });
      stale = makeProposal({
        type: ChangeProposalType.updateRule,
        artefactVersion: 1,
        payload: {
          targetId: rule.id,
          oldValue: 'OLD Rule',
          newValue: 'New Rule',
        },
      });
      addProposal = makeProposal({
        type: ChangeProposalType.addRule,
        artefactVersion: 1,
        payload: { item: { content: 'new rule' } },
      });

      result = computeStandardOutdatedIds(
        [fresh, stale, addProposal],
        standard,
        [rule],
      );
    });

    it('contains exactly one outdated proposal', () => {
      expect(result.size).toBe(1);
    });

    it('includes the stale proposal', () => {
      expect(result.has(stale.id)).toBe(true);
    });

    it('excludes the fresh proposal', () => {
      expect(result.has(fresh.id)).toBe(false);
    });

    it('excludes the add proposal', () => {
      expect(result.has(addProposal.id)).toBe(false);
    });
  });
});

describe('computeCommandOutdatedIds', () => {
  describe('when recipe is undefined', () => {
    it('returns an empty set', () => {
      const result = computeCommandOutdatedIds([], undefined);
      expect(result.size).toBe(0);
    });
  });

  describe('same artefact version (optimization short-circuit)', () => {
    it('never marks proposal as outdated regardless of payload mismatch', () => {
      const recipe = makeRecipe({ version: 4 });
      const proposal = makeProposal({
        type: ChangeProposalType.updateCommandName,
        artefactVersion: 4,
        payload: { oldValue: 'WRONG', newValue: 'new' },
      });

      const result = computeCommandOutdatedIds([proposal], recipe);
      expect(result.size).toBe(0);
    });
  });

  describe('scalar updates', () => {
    describe('updateCommandName', () => {
      describe('when oldValue matches current name', () => {
        it('is NOT outdated', () => {
          const recipe = makeRecipe({ name: 'My Command' });
          const proposal = makeProposal({
            type: ChangeProposalType.updateCommandName,
            artefactVersion: 1,
            payload: { oldValue: 'My Command', newValue: 'Renamed' },
          });

          const result = computeCommandOutdatedIds([proposal], recipe);
          expect(result.size).toBe(0);
        });
      });

      describe('when oldValue does not match current name', () => {
        it('IS outdated', () => {
          const recipe = makeRecipe({ name: 'My Command' });
          const proposal = makeProposal({
            type: ChangeProposalType.updateCommandName,
            artefactVersion: 1,
            payload: { oldValue: 'STALE name', newValue: 'Renamed' },
          });

          const result = computeCommandOutdatedIds([proposal], recipe);
          expect(result.has(proposal.id)).toBe(true);
        });
      });
    });

    describe('updateCommandDescription', () => {
      describe('when oldValue matches current content', () => {
        it('is NOT outdated', () => {
          const recipe = makeRecipe({ content: 'Step 1: do this' });
          const proposal = makeProposal({
            type: ChangeProposalType.updateCommandDescription,
            artefactVersion: 1,
            payload: { oldValue: 'Step 1: do this', newValue: 'Updated' },
          });

          const result = computeCommandOutdatedIds([proposal], recipe);
          expect(result.size).toBe(0);
        });
      });

      describe('when oldValue does not match current content', () => {
        it('IS outdated', () => {
          const recipe = makeRecipe({ content: 'Step 1: do this' });
          const proposal = makeProposal({
            type: ChangeProposalType.updateCommandDescription,
            artefactVersion: 1,
            payload: { oldValue: 'STALE content', newValue: 'Updated' },
          });

          const result = computeCommandOutdatedIds([proposal], recipe);
          expect(result.has(proposal.id)).toBe(true);
        });
      });
    });
  });

  describe('unknown proposal types are ignored', () => {
    it('does not mark unknown types as outdated', () => {
      const recipe = makeRecipe();
      // addRule is not a command type, should be ignored
      const proposal = makeProposal({
        type: ChangeProposalType.addRule,
        artefactVersion: 1,
        payload: { item: { content: 'something' } },
      });

      const result = computeCommandOutdatedIds([proposal], recipe);
      expect(result.size).toBe(0);
    });
  });

  describe('multiple proposals', () => {
    let result: Set<ChangeProposalId>;
    let fresh: ChangeProposal;
    let stale: ChangeProposal;

    beforeEach(() => {
      const recipe = makeRecipe({ name: 'Current', content: 'Current desc' });

      fresh = makeProposal({
        type: ChangeProposalType.updateCommandName,
        artefactVersion: 1,
        payload: { oldValue: 'Current', newValue: 'Renamed' },
      });
      stale = makeProposal({
        type: ChangeProposalType.updateCommandDescription,
        artefactVersion: 1,
        payload: { oldValue: 'OLD desc', newValue: 'New desc' },
      });

      result = computeCommandOutdatedIds([fresh, stale], recipe);
    });

    it('contains exactly one outdated proposal', () => {
      expect(result.size).toBe(1);
    });

    it('includes the stale proposal', () => {
      expect(result.has(stale.id)).toBe(true);
    });

    it('excludes the fresh proposal', () => {
      expect(result.has(fresh.id)).toBe(false);
    });
  });
});
