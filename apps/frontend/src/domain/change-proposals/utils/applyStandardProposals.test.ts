import { v4 as uuidv4 } from 'uuid';
import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  Rule,
  Standard,
  createChangeProposalId,
  createRuleId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createUserId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import {
  applyStandardProposals,
  getProposalNumbers,
} from './applyStandardProposals';

// Local test factories to avoid module boundary violations
const standardFactory = (standard?: Partial<Standard>): Standard => ({
  id: createStandardId(uuidv4()),
  name: 'Test Standard',
  slug: 'test-standard',
  description: 'Test standard description',
  version: 1,
  gitCommit: undefined,
  userId: createUserId(uuidv4()),
  scope: null,
  spaceId: createSpaceId(uuidv4()),
  ...standard,
});

const ruleFactory = (rule?: Partial<Rule>): Rule => ({
  id: createRuleId(uuidv4()),
  content: 'Test rule content describing a coding standard',
  standardVersionId: createStandardVersionId(uuidv4()),
  ...rule,
});

const changeProposalFactory = (
  proposal?: Partial<ChangeProposal<ChangeProposalType>>,
): ChangeProposal<ChangeProposalType> =>
  ({
    id: createChangeProposalId(uuidv4()),
    type: ChangeProposalType.updateStandardName,
    artefactId: createStandardId(uuidv4()),
    artefactVersion: 1,
    spaceId: createSpaceId(uuidv4()),
    payload: { oldValue: 'Old Name', newValue: 'New Name' },
    captureMode: ChangeProposalCaptureMode.commit,
    status: ChangeProposalStatus.pending,
    createdBy: createUserId(uuidv4()),
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...proposal,
  }) as ChangeProposal<ChangeProposalType>;

describe('applyStandardProposals', () => {
  const standardVersionId = createStandardVersionId(uuidv4());
  const standardId = createStandardId(uuidv4());
  const standard = standardFactory({
    id: standardId,
    name: 'Original Standard',
    description: 'Original description',
  });
  const rules = [
    ruleFactory({
      id: createRuleId('rule-1'),
      content: 'Rule 1 content',
      standardVersionId,
    }),
    ruleFactory({
      id: createRuleId('rule-2'),
      content: 'Rule 2 content',
      standardVersionId,
    }),
  ];

  describe('with no proposals', () => {
    const proposals: ChangeProposalWithConflicts[] = [];
    const acceptedIds = new Set<string>();

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      result = applyStandardProposals(standard, rules, proposals, acceptedIds);
    });

    it('returns the original standard name', () => {
      expect(result.name).toBe('Original Standard');
    });

    it('returns the original standard description', () => {
      expect(result.description).toBe('Original description');
    });

    it('returns the original rules', () => {
      expect(result.rules).toEqual(rules);
    });

    it('does not track name changes', () => {
      expect(result.changes.name).toBeUndefined();
    });

    it('does not track description changes', () => {
      expect(result.changes.description).toBeUndefined();
    });

    it('does not track rule additions', () => {
      expect(result.changes.rules.added.size).toBe(0);
    });

    it('does not track rule updates', () => {
      expect(result.changes.rules.updated.size).toBe(0);
    });

    it('does not track rule deletions', () => {
      expect(result.changes.rules.deleted.size).toBe(0);
    });
  });

  describe('with no accepted proposals', () => {
    const proposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposalId,
          type: ChangeProposalType.updateStandardName,
          artefactId: standardId,
          payload: { oldValue: 'Original Standard', newValue: 'New Name' },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set<string>();

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      result = applyStandardProposals(standard, rules, proposals, acceptedIds);
    });

    it('returns the original standard name', () => {
      expect(result.name).toBe('Original Standard');
    });

    it('does not track changes', () => {
      expect(result.changes.name).toBeUndefined();
    });
  });

  describe('when updating standard name', () => {
    const proposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposalId,
          type: ChangeProposalType.updateStandardName,
          artefactId: standardId,
          payload: { oldValue: 'Original Standard', newValue: 'Updated Name' },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([proposalId]);

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      result = applyStandardProposals(standard, rules, proposals, acceptedIds);
    });

    it('applies the new name', () => {
      expect(result.name).toBe('Updated Name');
    });

    it('tracks the name change', () => {
      expect(result.changes.name).toBeDefined();
    });

    it('tracks the original value', () => {
      expect(result.changes.name?.originalValue).toBe('Original Standard');
    });

    it('tracks the final value', () => {
      expect(result.changes.name?.finalValue).toBe('Updated Name');
    });

    it('tracks the proposal ID', () => {
      expect(result.changes.name?.proposalIds).toEqual([proposalId]);
    });
  });

  describe('when updating standard description', () => {
    const proposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposalId,
          type: ChangeProposalType.updateStandardDescription,
          artefactId: standardId,
          payload: {
            oldValue: 'Original description',
            newValue: 'Updated description',
          },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([proposalId]);

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      result = applyStandardProposals(standard, rules, proposals, acceptedIds);
    });

    it('applies the new description', () => {
      expect(result.description).toBe('Updated description');
    });

    it('tracks the description change', () => {
      expect(result.changes.description).toBeDefined();
    });

    it('tracks the original value', () => {
      expect(result.changes.description?.originalValue).toBe(
        'Original description',
      );
    });

    it('tracks the final value', () => {
      expect(result.changes.description?.finalValue).toBe(
        'Updated description',
      );
    });

    it('tracks the proposal ID', () => {
      expect(result.changes.description?.proposalIds).toEqual([proposalId]);
    });
  });

  describe('when adding a rule', () => {
    const proposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposalId,
          type: ChangeProposalType.addRule,
          artefactId: standardId,
          payload: { item: { content: 'New rule content' } },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([proposalId]);

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      result = applyStandardProposals(standard, rules, proposals, acceptedIds);
    });

    it('adds the new rule', () => {
      expect(result.rules).toHaveLength(3);
    });

    it('includes the new rule content', () => {
      expect(result.rules[2].content).toBe('New rule content');
    });

    it('tracks the rule addition', () => {
      expect(result.changes.rules.added.size).toBe(1);
    });

    it('associates the addition with the proposal', () => {
      const addedRuleId = result.rules[2].id;
      expect(result.changes.rules.added.get(addedRuleId)).toBe(proposalId);
    });
  });

  describe('when updating a rule', () => {
    const targetRuleId = createRuleId('rule-1');
    const proposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposalId,
          type: ChangeProposalType.updateRule,
          artefactId: standardId,
          payload: {
            targetId: targetRuleId,
            oldValue: 'Rule 1 content',
            newValue: 'Updated rule 1 content',
          },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([proposalId]);

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      result = applyStandardProposals(standard, rules, proposals, acceptedIds);
    });

    it('updates the rule content', () => {
      const updatedRule = result.rules.find((r) => r.id === targetRuleId);
      expect(updatedRule?.content).toBe('Updated rule 1 content');
    });

    it('keeps the same number of rules', () => {
      expect(result.rules).toHaveLength(2);
    });

    it('tracks the rule update', () => {
      expect(result.changes.rules.updated.size).toBe(1);
    });

    it('tracks the original content', () => {
      const updateInfo = result.changes.rules.updated.get(targetRuleId);
      expect(updateInfo?.originalValue).toBe('Rule 1 content');
    });

    it('tracks the final content', () => {
      const updateInfo = result.changes.rules.updated.get(targetRuleId);
      expect(updateInfo?.finalValue).toBe('Updated rule 1 content');
    });

    it('tracks the proposal ID', () => {
      const updateInfo = result.changes.rules.updated.get(targetRuleId);
      expect(updateInfo?.proposalIds).toEqual([proposalId]);
    });
  });

  describe('when deleting a rule', () => {
    const targetRuleId = createRuleId('rule-1');
    const proposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposalId,
          type: ChangeProposalType.deleteRule,
          artefactId: standardId,
          payload: {
            targetId: targetRuleId,
            item: { id: targetRuleId, content: 'Rule 1 content' },
          },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([proposalId]);

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      result = applyStandardProposals(standard, rules, proposals, acceptedIds);
    });

    it('removes the rule', () => {
      expect(result.rules).toHaveLength(1);
    });

    it('does not include the deleted rule', () => {
      const deletedRule = result.rules.find((r) => r.id === targetRuleId);
      expect(deletedRule).toBeUndefined();
    });

    it('tracks the rule deletion', () => {
      expect(result.changes.rules.deleted.has(targetRuleId)).toBe(true);
    });
  });

  describe('when applying multiple proposals in chronological order', () => {
    const proposal1Id = createChangeProposalId(uuidv4());
    const proposal2Id = createChangeProposalId(uuidv4());
    const proposal3Id = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposal1Id,
          type: ChangeProposalType.updateStandardName,
          artefactId: standardId,
          payload: {
            oldValue: 'Original Standard',
            newValue: 'First Update',
          },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: proposal2Id,
          type: ChangeProposalType.updateStandardName,
          artefactId: standardId,
          payload: { oldValue: 'First Update', newValue: 'Second Update' },
          createdAt: new Date('2024-01-02'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: proposal3Id,
          type: ChangeProposalType.updateStandardName,
          artefactId: standardId,
          payload: { oldValue: 'Second Update', newValue: 'Final Update' },
          createdAt: new Date('2024-01-03'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([proposal1Id, proposal2Id, proposal3Id]);

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      result = applyStandardProposals(standard, rules, proposals, acceptedIds);
    });

    it('applies changes in chronological order', () => {
      expect(result.name).toBe('Final Update');
    });

    it('tracks the original value from the first change', () => {
      expect(result.changes.name?.originalValue).toBe('Original Standard');
    });

    it('tracks the final value from the last change', () => {
      expect(result.changes.name?.finalValue).toBe('Final Update');
    });

    it('tracks all proposal IDs in order', () => {
      expect(result.changes.name?.proposalIds).toEqual([
        proposal1Id,
        proposal2Id,
        proposal3Id,
      ]);
    });
  });

  describe('when applying proposals in non-chronological order', () => {
    const earlierProposalId = createChangeProposalId(uuidv4());
    const laterProposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: laterProposalId,
          type: ChangeProposalType.updateStandardName,
          artefactId: standardId,
          payload: {
            oldValue: 'First Update',
            newValue: 'Second Update',
          },
          createdAt: new Date('2024-01-02'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: earlierProposalId,
          type: ChangeProposalType.updateStandardName,
          artefactId: standardId,
          payload: {
            oldValue: 'Original Standard',
            newValue: 'First Update',
          },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([earlierProposalId, laterProposalId]);

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      result = applyStandardProposals(standard, rules, proposals, acceptedIds);
    });

    it('sorts and applies proposals by createdAt date', () => {
      expect(result.name).toBe('Second Update');
    });

    it('tracks proposals in chronological order', () => {
      expect(result.changes.name?.proposalIds).toEqual([
        earlierProposalId,
        laterProposalId,
      ]);
    });
  });

  describe('when deleting a previously added rule', () => {
    const addProposalId = createChangeProposalId(uuidv4());

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      // First apply the add proposal to get the rule ID
      const addProposals: ChangeProposalWithConflicts[] = [
        {
          ...changeProposalFactory({
            id: addProposalId,
            type: ChangeProposalType.addRule,
            artefactId: standardId,
            payload: { item: { content: 'Temporarily added rule' } },
            createdAt: new Date('2024-01-01'),
          }),
          conflictsWith: [],
        },
      ];
      const addAcceptedIds = new Set([addProposalId]);

      const addResult = applyStandardProposals(
        standard,
        rules,
        addProposals,
        addAcceptedIds,
      );
      const addedRule = addResult.rules.find(
        (r) => r.content === 'Temporarily added rule',
      );

      if (!addedRule) {
        throw new Error('Added rule not found');
      }

      // Now apply both add and delete proposals together
      const deleteProposalId = createChangeProposalId(uuidv4());
      const allProposals: ChangeProposalWithConflicts[] = [
        ...addProposals,
        {
          ...changeProposalFactory({
            id: deleteProposalId,
            type: ChangeProposalType.deleteRule,
            artefactId: standardId,
            payload: {
              targetId: addedRule.id,
              item: { id: addedRule.id, content: 'Temporarily added rule' },
            },
            createdAt: new Date('2024-01-02'),
          }),
          conflictsWith: [],
        },
      ];
      const allAcceptedIds = new Set([addProposalId, deleteProposalId]);

      result = applyStandardProposals(
        standard,
        rules,
        allProposals,
        allAcceptedIds,
      );
    });

    it('removes the temporarily added rule', () => {
      const tempRule = result.rules.find(
        (r) => r.content === 'Temporarily added rule',
      );
      expect(tempRule).toBeUndefined();
    });

    it('does not track the addition', () => {
      expect(result.changes.rules.added.size).toBe(0);
    });

    it('does not track any deletion', () => {
      expect(result.changes.rules.deleted.size).toBe(0);
    });

    it('returns to the original number of rules', () => {
      expect(result.rules).toHaveLength(2);
    });
  });

  describe('when applying mixed proposal types', () => {
    const nameProposalId = createChangeProposalId(uuidv4());
    const descProposalId = createChangeProposalId(uuidv4());
    const addRuleProposalId = createChangeProposalId(uuidv4());
    const updateRuleProposalId = createChangeProposalId(uuidv4());
    const deleteRuleProposalId = createChangeProposalId(uuidv4());
    const targetUpdateRuleId = createRuleId('rule-1');
    const targetDeleteRuleId = createRuleId('rule-2');
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: nameProposalId,
          type: ChangeProposalType.updateStandardName,
          artefactId: standardId,
          payload: {
            oldValue: 'Original Standard',
            newValue: 'Mixed Updates',
          },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: descProposalId,
          type: ChangeProposalType.updateStandardDescription,
          artefactId: standardId,
          payload: {
            oldValue: 'Original description',
            newValue: 'New description',
          },
          createdAt: new Date('2024-01-02'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: addRuleProposalId,
          type: ChangeProposalType.addRule,
          artefactId: standardId,
          payload: { item: { content: 'Brand new rule' } },
          createdAt: new Date('2024-01-03'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: updateRuleProposalId,
          type: ChangeProposalType.updateRule,
          artefactId: standardId,
          payload: {
            targetId: targetUpdateRuleId,
            oldValue: 'Rule 1 content',
            newValue: 'Modified rule 1',
          },
          createdAt: new Date('2024-01-04'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: deleteRuleProposalId,
          type: ChangeProposalType.deleteRule,
          artefactId: standardId,
          payload: {
            targetId: targetDeleteRuleId,
            item: { id: targetDeleteRuleId, content: 'Rule 2 content' },
          },
          createdAt: new Date('2024-01-05'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([
      nameProposalId,
      descProposalId,
      addRuleProposalId,
      updateRuleProposalId,
      deleteRuleProposalId,
    ]);

    let result: ReturnType<typeof applyStandardProposals>;

    beforeEach(() => {
      result = applyStandardProposals(standard, rules, proposals, acceptedIds);
    });

    it('applies the name change', () => {
      expect(result.name).toBe('Mixed Updates');
    });

    it('applies the description change', () => {
      expect(result.description).toBe('New description');
    });

    it('has the correct number of rules after all operations', () => {
      expect(result.rules).toHaveLength(2);
    });

    it('includes the added rule', () => {
      const addedRule = result.rules.find(
        (r) => r.content === 'Brand new rule',
      );
      expect(addedRule).toBeDefined();
    });

    it('includes the updated rule with new content', () => {
      const updatedRule = result.rules.find((r) => r.id === targetUpdateRuleId);
      expect(updatedRule?.content).toBe('Modified rule 1');
    });

    it('does not include the deleted rule', () => {
      const deletedRule = result.rules.find((r) => r.id === targetDeleteRuleId);
      expect(deletedRule).toBeUndefined();
    });

    it('tracks the name change', () => {
      expect(result.changes.name).toBeDefined();
    });

    it('tracks the description change', () => {
      expect(result.changes.description).toBeDefined();
    });

    it('tracks the rule addition', () => {
      expect(result.changes.rules.added.size).toBe(1);
    });

    it('tracks the rule update', () => {
      expect(result.changes.rules.updated.size).toBe(1);
    });

    it('tracks the rule deletion', () => {
      expect(result.changes.rules.deleted.size).toBe(1);
    });
  });
});

describe('getProposalNumbers', () => {
  describe('with proposals in chronological order', () => {
    const id1 = createChangeProposalId(uuidv4());
    const id2 = createChangeProposalId(uuidv4());
    const id3 = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: id1,
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: id2,
          createdAt: new Date('2024-01-02'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: id3,
          createdAt: new Date('2024-01-03'),
        }),
        conflictsWith: [],
      },
    ];

    let result: number[];

    beforeEach(() => {
      result = getProposalNumbers([id1, id2, id3], proposals);
    });

    it('returns sequential numbers starting from 1', () => {
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('with proposals in non-chronological order', () => {
    const id1 = createChangeProposalId(uuidv4());
    const id2 = createChangeProposalId(uuidv4());
    const id3 = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: id3,
          createdAt: new Date('2024-01-03'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: id1,
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: id2,
          createdAt: new Date('2024-01-02'),
        }),
        conflictsWith: [],
      },
    ];

    let result: number[];

    beforeEach(() => {
      result = getProposalNumbers([id3, id1, id2], proposals);
    });

    it('returns numbers based on chronological order', () => {
      expect(result).toEqual([3, 1, 2]);
    });
  });

  describe('with missing proposal IDs', () => {
    const id1 = createChangeProposalId(uuidv4());
    const id2 = createChangeProposalId(uuidv4());
    const missingId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: id1,
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: id2,
          createdAt: new Date('2024-01-02'),
        }),
        conflictsWith: [],
      },
    ];

    let result: number[];

    beforeEach(() => {
      result = getProposalNumbers([id1, missingId, id2], proposals);
    });

    it('filters out missing IDs', () => {
      expect(result).toEqual([1, 2]);
    });
  });
});
