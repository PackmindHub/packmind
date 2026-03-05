import { StandardChangeProposalApplier } from './StandardChangeProposalApplier';
import { DiffService } from './DiffService';
import { ChangeProposalConflictError } from './ChangeProposalConflictError';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';
import { ChangeProposalStatus } from '../ChangeProposalStatus';
import { ChangeProposalCaptureMode } from '../ChangeProposalCaptureMode';
import { createChangeProposalId } from '../ChangeProposalId';
import { StandardVersion } from '../../standards/StandardVersion';
import { createStandardId } from '../../standards/StandardId';
import { createStandardVersionId } from '../../standards/StandardVersionId';
import { createRuleId } from '../../standards/RuleId';
import { createSpaceId } from '../../spaces/SpaceId';
import { createUserId } from '../../accounts/User';
import { Rule } from '../../standards/Rule';

let idCounter = 0;
const nextId = () => `test-id-${++idCounter}`;

const changeProposalFactory = <T extends ChangeProposalType>(
  overrides: Partial<ChangeProposal<T>> & {
    type: T;
    payload: ChangeProposal<T>['payload'];
  },
): ChangeProposal<T> =>
  ({
    id: createChangeProposalId(nextId()),
    artefactId: createStandardId(nextId()),
    artefactVersion: 1,
    spaceId: createSpaceId(nextId()),
    captureMode: ChangeProposalCaptureMode.commit,
    message: '',
    status: ChangeProposalStatus.pending,
    decision: null,
    createdBy: createUserId(nextId()),
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ChangeProposal<T>;

const standardVersionFactory = (
  overrides?: Partial<StandardVersion>,
): StandardVersion => ({
  id: createStandardVersionId(nextId()),
  standardId: createStandardId(nextId()),
  name: 'Test Standard',
  slug: 'test-standard',
  description: 'A test description',
  version: 1,
  scope: null,
  rules: [],
  ...overrides,
});

const ruleFactory = (overrides?: Partial<Rule>): Rule => ({
  id: createRuleId(nextId()),
  content: 'Rule content',
  standardVersionId: createStandardVersionId(nextId()),
  ...overrides,
});

describe('StandardChangeProposalApplier', () => {
  const diffService = new DiffService();
  const applier = new StandardChangeProposalApplier(diffService);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('areChangesApplicable', () => {
    it('returns true for standard change types', () => {
      const proposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          payload: { oldValue: 'Old', newValue: 'New' },
        }),
      ];

      expect(applier.areChangesApplicable(proposals)).toBe(true);
    });

    it('returns true for all standard change types combined', () => {
      const ruleId = createRuleId(nextId());
      const proposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          payload: { oldValue: 'Old', newValue: 'New' },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateStandardScope,
          payload: { oldValue: 'old-scope', newValue: 'new-scope' },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          payload: { oldValue: 'old desc', newValue: 'new desc' },
        }),
        changeProposalFactory({
          type: ChangeProposalType.addRule,
          payload: { item: { content: 'new rule' } },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateRule,
          payload: { targetId: ruleId, oldValue: 'old', newValue: 'new' },
        }),
        changeProposalFactory({
          type: ChangeProposalType.deleteRule,
          payload: {
            targetId: ruleId,
            item: { id: ruleId, content: 'rule' },
          },
        }),
      ];

      expect(applier.areChangesApplicable(proposals as ChangeProposal[])).toBe(
        true,
      );
    });

    it('returns false for non-standard change types', () => {
      const proposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateCommandName,
          payload: { oldValue: 'Old', newValue: 'New' },
        }),
      ];

      expect(applier.areChangesApplicable(proposals as ChangeProposal[])).toBe(
        false,
      );
    });

    it('returns false when mixing standard and non-standard types', () => {
      const proposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          payload: { oldValue: 'Old', newValue: 'New' },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillName,
          payload: { oldValue: 'Old', newValue: 'New' },
        }),
      ];

      expect(applier.areChangesApplicable(proposals as ChangeProposal[])).toBe(
        false,
      );
    });
  });

  describe('applyChangeProposals', () => {
    describe('updateStandardName', () => {
      it('overrides the name with the new value', () => {
        const source = standardVersionFactory({ name: 'Original Name' });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          payload: { oldValue: 'Original Name', newValue: 'Updated Name' },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.name).toBe('Updated Name');
      });

      it('applies multiple name changes sequentially', () => {
        const source = standardVersionFactory({ name: 'First' });
        const proposals = [
          changeProposalFactory({
            type: ChangeProposalType.updateStandardName,
            payload: { oldValue: 'First', newValue: 'Second' },
          }),
          changeProposalFactory({
            type: ChangeProposalType.updateStandardName,
            payload: { oldValue: 'Second', newValue: 'Third' },
          }),
        ];

        const result = applier.applyChangeProposals(
          source,
          proposals as ChangeProposal[],
        );

        expect(result.name).toBe('Third');
      });
    });

    describe('updateStandardScope', () => {
      it('overrides the scope with the new value', () => {
        const source = standardVersionFactory({ scope: 'old-scope' });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateStandardScope,
          payload: { oldValue: 'old-scope', newValue: 'new-scope' },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.scope).toBe('new-scope');
      });
    });

    describe('updateStandardDescription', () => {
      it('applies diff to the description', () => {
        const source = standardVersionFactory({
          description: 'line1\nline2\nline3',
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          payload: {
            oldValue: 'line1\nline2\nline3',
            newValue: 'line1\nmodified\nline3',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.description).toBe('line1\nmodified\nline3');
      });

      it('throws ChangeProposalConflictError on conflict', () => {
        const source = standardVersionFactory({
          description: 'line1\nchanged-by-someone\nline3',
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          payload: {
            oldValue: 'line1\noriginal\nline3',
            newValue: 'line1\nchanged-by-proposal\nline3',
          },
        });

        expect(() =>
          applier.applyChangeProposals(source, [proposal as ChangeProposal]),
        ).toThrow(ChangeProposalConflictError);
      });
    });

    describe('addRule', () => {
      it('adds a new rule to the standard version', () => {
        const source = standardVersionFactory({ rules: [] });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.addRule,
          payload: { item: { content: 'New rule content' } },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        const rules = result.rules ?? [];
        expect(rules).toHaveLength(1);
        expect(rules[0].content).toBe('New rule content');
        expect(rules[0].standardVersionId).toBe(source.id);
      });

      it('appends to existing rules', () => {
        const existingRule = ruleFactory({ content: 'Existing rule' });
        const source = standardVersionFactory({ rules: [existingRule] });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.addRule,
          payload: { item: { content: 'Another rule' } },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.rules).toHaveLength(2);
      });
    });

    describe('updateRule', () => {
      it('overrides the content of the targeted rule', () => {
        const ruleId = createRuleId('rule-to-update');
        const rule = ruleFactory({ id: ruleId, content: 'Old content' });
        const source = standardVersionFactory({ rules: [rule] });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateRule,
          payload: {
            targetId: ruleId,
            oldValue: 'Old content',
            newValue: 'New content',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect((result.rules ?? [])[0].content).toBe('New content');
      });

      it('preserves the rule ID', () => {
        const ruleId = createRuleId('rule-to-update');
        const rule = ruleFactory({ id: ruleId, content: 'Old content' });
        const source = standardVersionFactory({ rules: [rule] });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateRule,
          payload: {
            targetId: ruleId,
            oldValue: 'Old content',
            newValue: 'Updated content',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect((result.rules ?? [])[0].id).toBe(ruleId);
      });

      it('does not modify other rules', () => {
        const targetRuleId = createRuleId('target-rule');
        const otherRuleId = createRuleId('other-rule');
        const targetRule = ruleFactory({
          id: targetRuleId,
          content: 'Target content',
        });
        const otherRule = ruleFactory({
          id: otherRuleId,
          content: 'Other content',
        });
        const source = standardVersionFactory({
          rules: [targetRule, otherRule],
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateRule,
          payload: {
            targetId: targetRuleId,
            oldValue: 'Target content',
            newValue: 'Updated target',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect((result.rules ?? [])[1].content).toBe('Other content');
      });
    });

    describe('deleteRule', () => {
      it('removes the targeted rule', () => {
        const ruleId = createRuleId('rule-to-delete');
        const rule = ruleFactory({ id: ruleId, content: 'To be deleted' });
        const source = standardVersionFactory({ rules: [rule] });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.deleteRule,
          payload: {
            targetId: ruleId,
            item: { id: ruleId, content: 'To be deleted' },
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.rules).toEqual([]);
      });

      it('preserves other rules', () => {
        const ruleToDelete = ruleFactory({
          id: createRuleId('delete-me'),
          content: 'Delete me',
        });
        const ruleToKeep = ruleFactory({
          id: createRuleId('keep-me'),
          content: 'Keep me',
        });
        const source = standardVersionFactory({
          rules: [ruleToDelete, ruleToKeep],
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.deleteRule,
          payload: {
            targetId: ruleToDelete.id,
            item: {
              id: ruleToDelete.id,
              content: 'Delete me',
            },
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.rules).toHaveLength(1);
        expect((result.rules ?? [])[0].id).toBe(ruleToKeep.id);
      });
    });

    describe('multiple changes', () => {
      it('applies multiple different change types sequentially', () => {
        const existingRule = ruleFactory({ content: 'Existing rule' });
        const source = standardVersionFactory({
          name: 'Old Name',
          description: 'Old description',
          scope: 'old-scope',
          rules: [existingRule],
        });
        const proposals = [
          changeProposalFactory({
            type: ChangeProposalType.updateStandardName,
            payload: { oldValue: 'Old Name', newValue: 'New Name' },
          }),
          changeProposalFactory({
            type: ChangeProposalType.updateStandardScope,
            payload: { oldValue: 'old-scope', newValue: 'new-scope' },
          }),
          changeProposalFactory({
            type: ChangeProposalType.addRule,
            payload: { item: { content: 'Added rule' } },
          }),
        ];

        const result = applier.applyChangeProposals(
          source,
          proposals as ChangeProposal[],
        );

        expect(result.name).toBe('New Name');
        expect(result.scope).toBe('new-scope');
        expect(result.rules).toHaveLength(2);
      });
    });

    describe('unsupported type', () => {
      it('throws an error for unsupported change proposal types', () => {
        const source = standardVersionFactory();
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateCommandName,
          payload: { oldValue: 'Old', newValue: 'New' },
        });

        expect(() =>
          applier.applyChangeProposals(source, [
            proposal as unknown as ChangeProposal,
          ]),
        ).toThrow('Unsupported ChangeProposalType');
      });
    });
  });
});
