import { StandardChangeProposalApplier } from './StandardChangeProposalApplier';
import { DiffService } from './DiffService';
import { ChangeProposalConflictError } from './ChangeProposalConflictError';
import { v4 as uuidv4 } from 'uuid';
import { createChangeProposalFactory } from './testHelpers';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';
import { ChangeProposalStatus } from '../ChangeProposalStatus';
import { StandardVersion } from '../../standards/StandardVersion';
import { createStandardId } from '../../standards/StandardId';
import { createStandardVersionId } from '../../standards/StandardVersionId';
import { createRuleId } from '../../standards/RuleId';
import { Rule } from '../../standards/Rule';

const changeProposalFactory = createChangeProposalFactory(createStandardId);

const standardVersionFactory = (
  overrides?: Partial<StandardVersion>,
): StandardVersion => ({
  id: createStandardVersionId(uuidv4()),
  standardId: createStandardId(uuidv4()),
  name: 'Test Standard',
  slug: 'test-standard',
  description: 'A test description',
  version: 1,
  scope: null,
  rules: [],
  ...overrides,
});

const ruleFactory = (overrides?: Partial<Rule>): Rule => ({
  id: createRuleId(uuidv4()),
  content: 'Rule content',
  standardVersionId: createStandardVersionId(uuidv4()),
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
      const ruleId = createRuleId(uuidv4());
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

    describe('when mixing standard and non-standard types', () => {
      it('returns false', () => {
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

        expect(
          applier.areChangesApplicable(proposals as ChangeProposal[]),
        ).toBe(false);
      });
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

        expect(result.version.name).toBe('Updated Name');
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

        expect(result.version.name).toBe('Third');
      });

      describe('when the live name diverged from the base on the same words', () => {
        it('throws ChangeProposalConflictError', () => {
          const source = standardVersionFactory({ name: 'Renamed Already' });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateStandardName,
            payload: { oldValue: 'Original Name', newValue: 'My New Name' },
          });

          expect(() =>
            applier.applyChangeProposals(source, [proposal as ChangeProposal]),
          ).toThrow(ChangeProposalConflictError);
        });
      });

      describe('when decision differs from payload', () => {
        it('uses the decision newValue instead of payload newValue', () => {
          const source = standardVersionFactory({ name: 'Original Name' });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateStandardName,
            payload: {
              oldValue: 'Original Name',
              newValue: 'Payload Name',
            },
            status: ChangeProposalStatus.applied,
            decision: {
              oldValue: 'Original Name',
              newValue: 'Decision Name',
            },
          });

          const result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);

          expect(result.version.name).toBe('Decision Name');
        });
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

        expect(result.version.scope).toBe('new-scope');
      });

      describe('when decision differs from payload', () => {
        it('uses the decision newValue instead of payload newValue', () => {
          const source = standardVersionFactory({ scope: 'old-scope' });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateStandardScope,
            payload: {
              oldValue: 'old-scope',
              newValue: 'payload-scope',
            },
            status: ChangeProposalStatus.applied,
            decision: {
              oldValue: 'old-scope',
              newValue: 'decision-scope',
            },
          });

          const result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);

          expect(result.version.scope).toBe('decision-scope');
        });
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

        expect(result.version.description).toBe('line1\nmodified\nline3');
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

      describe('when decision differs from payload', () => {
        it('applies diff using the decision values instead of payload values', () => {
          const source = standardVersionFactory({
            description: 'line1\nline2\nline3',
          });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateStandardDescription,
            payload: {
              oldValue: 'line1\nline2\nline3',
              newValue: 'line1\npayload-modified\nline3',
            },
            status: ChangeProposalStatus.applied,
            decision: {
              oldValue: 'line1\nline2\nline3',
              newValue: 'line1\ndecision-modified\nline3',
            },
          });

          const result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);

          expect(result.version.description).toBe(
            'line1\ndecision-modified\nline3',
          );
        });
      });
    });

    describe('addRule', () => {
      describe('when adding a rule to an empty standard', () => {
        let result: ReturnType<typeof applier.applyChangeProposals>;
        let source: ReturnType<typeof standardVersionFactory>;

        beforeEach(() => {
          source = standardVersionFactory({ rules: [] });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.addRule,
            payload: { item: { content: 'New rule content' } },
          });

          result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);
        });

        it('creates one rule', () => {
          expect(result.version.rules ?? []).toHaveLength(1);
        });

        it('sets the rule content', () => {
          expect((result.version.rules ?? [])[0].content).toBe(
            'New rule content',
          );
        });

        it('sets the standardVersionId', () => {
          expect((result.version.rules ?? [])[0].standardVersionId).toBe(
            source.id,
          );
        });
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

        expect(result.version.rules).toHaveLength(2);
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

        expect((result.version.rules ?? [])[0].content).toBe('New content');
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

        expect((result.version.rules ?? [])[0].id).toBe(ruleId);
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

        expect((result.version.rules ?? [])[1].content).toBe('Other content');
      });

      describe('when the live rule content diverged from the base', () => {
        it('throws ChangeProposalConflictError', () => {
          const ruleId = createRuleId('rule-to-update');
          const rule = ruleFactory({
            id: ruleId,
            content: 'Edited by someone else',
          });
          const source = standardVersionFactory({ rules: [rule] });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateRule,
            payload: {
              targetId: ruleId,
              oldValue: 'Original content',
              newValue: 'My new content',
            },
          });

          expect(() =>
            applier.applyChangeProposals(source, [proposal as ChangeProposal]),
          ).toThrow(ChangeProposalConflictError);
        });
      });

      describe('when the target id names no rule', () => {
        it('rewrites the rule carrying the replaced content', () => {
          const rule = ruleFactory({ content: 'Old content' });
          const source = standardVersionFactory({ rules: [rule] });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateRule,
            payload: {
              targetId: createRuleId('unresolved'),
              oldValue: 'Old content',
              newValue: 'New content',
            },
          });

          const result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);

          expect((result.version.rules ?? [])[0].content).toBe('New content');
        });

        it('preserves the id of the rule it matched', () => {
          const rule = ruleFactory({ content: 'Old content' });
          const source = standardVersionFactory({ rules: [rule] });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateRule,
            payload: {
              targetId: createRuleId('unresolved'),
              oldValue: 'Old content',
              newValue: 'New content',
            },
          });

          const result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);

          expect((result.version.rules ?? [])[0].id).toBe(rule.id);
        });

        describe('when no rule carries it', () => {
          it('throws ChangeProposalConflictError', () => {
            const rule = ruleFactory({ content: 'Something else entirely' });
            const source = standardVersionFactory({ rules: [rule] });
            const proposal = changeProposalFactory({
              type: ChangeProposalType.updateRule,
              payload: {
                targetId: createRuleId('unresolved'),
                oldValue: 'Old content',
                newValue: 'New content',
              },
            });

            expect(() =>
              applier.applyChangeProposals(source, [
                proposal as ChangeProposal,
              ]),
            ).toThrow(ChangeProposalConflictError);
          });
        });

        describe('when several rules carry the replaced content', () => {
          it('throws ChangeProposalConflictError, since none can be told from the others', () => {
            const rules = [
              ruleFactory({ content: 'Duplicated content' }),
              ruleFactory({ content: 'Duplicated content' }),
            ];
            const source = standardVersionFactory({ rules });
            const proposal = changeProposalFactory({
              type: ChangeProposalType.updateRule,
              payload: {
                targetId: createRuleId('unresolved'),
                oldValue: 'Duplicated content',
                newValue: 'New content',
              },
            });

            expect(() =>
              applier.applyChangeProposals(source, [
                proposal as ChangeProposal,
              ]),
            ).toThrow(ChangeProposalConflictError);
          });
        });

        describe('when a reviewer adjusted the decision', () => {
          it('matches the rule named by the decision, not by the payload', () => {
            const rule = ruleFactory({ content: 'Reviewer chose this one' });
            const source = standardVersionFactory({ rules: [rule] });
            const proposal = changeProposalFactory({
              type: ChangeProposalType.updateRule,
              payload: {
                targetId: createRuleId('unresolved'),
                oldValue: 'What the client originally sent',
                newValue: 'New content',
              },
              status: ChangeProposalStatus.applied,
              decision: {
                targetId: createRuleId('unresolved'),
                oldValue: 'Reviewer chose this one',
                newValue: 'New content',
              },
            });

            const result = applier.applyChangeProposals(source, [
              proposal as ChangeProposal,
            ]);

            expect((result.version.rules ?? [])[0].content).toBe('New content');
          });
        });
      });

      describe('when the target id names a rule', () => {
        it('ignores another rule sharing the replaced content', () => {
          const targeted = ruleFactory({
            id: createRuleId('targeted'),
            content: 'Shared content',
          });
          const untouched = ruleFactory({
            id: createRuleId('untouched'),
            content: 'Shared content',
          });
          const source = standardVersionFactory({
            rules: [targeted, untouched],
          });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateRule,
            payload: {
              targetId: targeted.id,
              oldValue: 'Shared content',
              newValue: 'New content',
            },
          });

          const result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);

          expect((result.version.rules ?? [])[1].content).toBe(
            'Shared content',
          );
        });
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

        expect(result.version.rules).toEqual([]);
      });

      describe('when deleting one of multiple rules', () => {
        let result: ReturnType<typeof applier.applyChangeProposals>;
        let ruleToKeep: ReturnType<typeof ruleFactory>;

        beforeEach(() => {
          const ruleToDelete = ruleFactory({
            id: createRuleId('delete-me'),
            content: 'Delete me',
          });
          ruleToKeep = ruleFactory({
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

          result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);
        });

        it('removes the deleted rule', () => {
          expect(result.version.rules).toHaveLength(1);
        });

        it('keeps the other rule', () => {
          expect((result.version.rules ?? [])[0].id).toBe(ruleToKeep.id);
        });
      });

      describe('when the target id names no rule', () => {
        it('removes the rule carrying the content the proposal names', () => {
          const rule = ruleFactory({ content: 'To be deleted' });
          const source = standardVersionFactory({ rules: [rule] });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.deleteRule,
            payload: {
              targetId: createRuleId('unresolved'),
              item: {
                id: createRuleId('unresolved'),
                content: 'To be deleted',
              },
            },
          });

          const result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);

          expect(result.version.rules).toEqual([]);
        });

        describe('when no rule carries that content', () => {
          it('throws ChangeProposalConflictError', () => {
            const rule = ruleFactory({ content: 'Keep me' });
            const source = standardVersionFactory({ rules: [rule] });
            const proposal = changeProposalFactory({
              type: ChangeProposalType.deleteRule,
              payload: {
                targetId: createRuleId('unresolved'),
                item: {
                  id: createRuleId('unresolved'),
                  content: 'To be deleted',
                },
              },
            });

            expect(() =>
              applier.applyChangeProposals(source, [
                proposal as ChangeProposal,
              ]),
            ).toThrow(ChangeProposalConflictError);
          });
        });

        describe('when a reviewer adjusted the decision', () => {
          it('removes the rule named by the decision, not by the payload', () => {
            const rules = [
              ruleFactory({ content: 'Reviewer chose this one' }),
              ruleFactory({ content: 'What the client originally sent' }),
            ];
            const source = standardVersionFactory({ rules });
            const proposal = changeProposalFactory({
              type: ChangeProposalType.deleteRule,
              payload: {
                targetId: createRuleId('unresolved'),
                item: {
                  id: createRuleId('unresolved'),
                  content: 'What the client originally sent',
                },
              },
              status: ChangeProposalStatus.applied,
              decision: {
                targetId: createRuleId('unresolved'),
                item: {
                  id: createRuleId('unresolved'),
                  content: 'Reviewer chose this one',
                },
              },
            });

            const result = applier.applyChangeProposals(source, [
              proposal as ChangeProposal,
            ]);

            expect(
              (result.version.rules ?? []).map((rule) => rule.content),
            ).toEqual(['What the client originally sent']);
          });
        });

        describe('when several rules carry that content', () => {
          it('removes all of them, since the standard is meant to be rid of it', () => {
            const rules = [
              ruleFactory({ content: 'Duplicated content' }),
              ruleFactory({ content: 'Duplicated content' }),
              ruleFactory({ content: 'Keep me' }),
            ];
            const source = standardVersionFactory({ rules });
            const proposal = changeProposalFactory({
              type: ChangeProposalType.deleteRule,
              payload: {
                targetId: createRuleId('unresolved'),
                item: {
                  id: createRuleId('unresolved'),
                  content: 'Duplicated content',
                },
              },
            });

            const result = applier.applyChangeProposals(source, [
              proposal as ChangeProposal,
            ]);

            expect(
              (result.version.rules ?? []).map((rule) => rule.content),
            ).toEqual(['Keep me']);
          });
        });
      });

      describe('when the target id names a rule', () => {
        it('keeps another rule sharing its content', () => {
          const targeted = ruleFactory({
            id: createRuleId('targeted'),
            content: 'Shared content',
          });
          const untouched = ruleFactory({
            id: createRuleId('untouched'),
            content: 'Shared content',
          });
          const source = standardVersionFactory({
            rules: [targeted, untouched],
          });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.deleteRule,
            payload: {
              targetId: targeted.id,
              item: { id: targeted.id, content: 'Shared content' },
            },
          });

          const result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);

          expect((result.version.rules ?? [])[0].id).toBe(untouched.id);
        });
      });
    });

    describe('multiple changes', () => {
      let result: ReturnType<typeof applier.applyChangeProposals>;

      beforeEach(() => {
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

        result = applier.applyChangeProposals(
          source,
          proposals as ChangeProposal[],
        );
      });

      it('updates the name', () => {
        expect(result.version.name).toBe('New Name');
      });

      it('updates the scope', () => {
        expect(result.version.scope).toBe('new-scope');
      });

      it('adds the new rule', () => {
        expect(result.version.rules).toHaveLength(2);
      });
    });

    describe('unsupported type', () => {
      it('returns source unchanged for unsupported change proposal types', () => {
        const source = standardVersionFactory();
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateCommandName,
          payload: { oldValue: 'Old', newValue: 'New' },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as unknown as ChangeProposal,
        ]);

        expect(result.version).toEqual(source);
      });
    });
  });
});
