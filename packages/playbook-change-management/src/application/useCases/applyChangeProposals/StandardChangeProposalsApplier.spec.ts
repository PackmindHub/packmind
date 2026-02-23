import { standardVersionFactory, ruleFactory } from '@packmind/standards/test';
import {
  ChangeProposalType,
  createChangeProposalId,
  createUserId,
  createOrganizationId,
  createSpaceId,
  IStandardsPort,
} from '@packmind/types';
import { changeProposalFactory } from '../../../../test';
import { DiffService } from '../../services/DiffService';
import { ChangeProposalConflictError } from '../../../domain/errors';
import { StandardChangeProposalsApplier } from './StandardChangeProposalsApplier';

describe('StandardChangeProposalsApplier', () => {
  let applier: StandardChangeProposalsApplier;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let diffService: DiffService;

  beforeEach(() => {
    diffService = new DiffService();
    standardsPort = {} as unknown as jest.Mocked<IStandardsPort>;

    applier = new StandardChangeProposalsApplier(diffService, standardsPort);
  });

  const rule1 = ruleFactory({
    content: 'Always use TypeScript for new files',
  });

  const rule2 = ruleFactory({
    content: 'Use const for variables that do not change',
  });

  const standardVersion = standardVersionFactory({
    name: 'TypeScript Best Practices',
    description: 'A collection of TypeScript best practices',
    rules: [rule1, rule2],
  });

  describe('areChangesApplicable', () => {
    it('returns true for standard change types', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
        }),
        changeProposalFactory({
          type: ChangeProposalType.addRule,
        }),
      ];

      expect(applier.areChangesApplicable(changeProposals)).toBe(true);
    });

    it('returns false for non-standard change types', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillName,
        }),
      ];

      expect(applier.areChangesApplicable(changeProposals)).toBe(false);
    });
  });

  describe('applyChangeProposal', () => {
    describe('when updating the standard name', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          payload: {
            oldValue: standardVersion.name,
            newValue: `before--${standardVersion.name}`,
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          payload: {
            oldValue: standardVersion.name,
            newValue: `${standardVersion.name}--after`,
          },
        }),
      ];

      it('overrides the standard name with each proposal', () => {
        const newStandardVersion = applier.applyChangeProposals(
          standardVersion,
          changeProposals,
        );

        expect(newStandardVersion).toEqual({
          ...standardVersion,
          name: `${standardVersion.name}--after`,
        });
      });
    });

    describe('when updating the standard description', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          payload: {
            oldValue: standardVersion.description,
            newValue: `A line before:\n${standardVersion.description}`,
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateStandardDescription,
          payload: {
            oldValue: standardVersion.description,
            newValue: `${standardVersion.description}\nA line after`,
          },
        }),
      ];

      it('uses the diff service to apply the changes', () => {
        const newVersion = applier.applyChangeProposals(
          standardVersion,
          changeProposals,
        );

        expect(newVersion).toEqual({
          ...standardVersion,
          description: `A line before:\n${standardVersion.description}\nA line after`,
        });
      });

      it('throws a ChangeProposalConflictError if applying the diff fails', () => {
        expect(() =>
          applier.applyChangeProposals(standardVersion, [
            changeProposalFactory({
              id: createChangeProposalId('proposal-1'),
              type: ChangeProposalType.updateStandardDescription,
              payload: {
                oldValue: standardVersion.description,
                newValue: `---${standardVersion.description}`,
              },
            }),
            changeProposalFactory({
              id: createChangeProposalId('proposal-2'),
              type: ChangeProposalType.updateStandardDescription,
              payload: {
                oldValue: standardVersion.description,
                newValue: `${standardVersion.description}---`,
              },
            }),
          ]),
        ).toThrow(
          new ChangeProposalConflictError(createChangeProposalId('proposal-2')),
        );
      });
    });

    describe('when adding a rule', () => {
      const newRuleContent = 'Use async/await instead of promises';
      const changeProposal = changeProposalFactory({
        type: ChangeProposalType.addRule,
        payload: {
          item: {
            content: newRuleContent,
          },
        },
      });

      it('adds the new rule to the rules array', () => {
        const newVersion = applier.applyChangeProposals(standardVersion, [
          changeProposal,
        ]);

        expect(newVersion.rules).toEqual([
          expect.objectContaining({ content: rule1.content }),
          expect.objectContaining({ content: rule2.content }),
          expect.objectContaining({
            content: newRuleContent,
            standardVersionId: standardVersion.id,
          }),
        ]);
      });

      it('generates a new rule ID for the added rule', () => {
        const newVersion = applier.applyChangeProposals(standardVersion, [
          changeProposal,
        ]);

        expect(newVersion.rules).toEqual([
          expect.objectContaining({ id: rule1.id }),
          expect.objectContaining({ id: rule2.id }),
          expect.objectContaining({
            id: expect.not.stringContaining(rule1.id),
          }),
        ]);
      });
    });

    describe('when updating a rule', () => {
      const updatedContent = 'Always use TypeScript strict mode';
      const changeProposal = changeProposalFactory({
        type: ChangeProposalType.updateRule,
        payload: {
          targetId: rule1.id,
          oldValue: rule1.content,
          newValue: updatedContent,
        },
      });

      it('overrides the rule content with the new value', () => {
        const newVersion = applier.applyChangeProposals(standardVersion, [
          changeProposal,
        ]);

        expect(newVersion.rules).toEqual([
          expect.objectContaining({ content: updatedContent }),
          expect.objectContaining({ content: rule2.content }),
        ]);
      });

      it('preserves the rule ID', () => {
        const newVersion = applier.applyChangeProposals(standardVersion, [
          changeProposal,
        ]);

        expect(newVersion.rules).toEqual([
          expect.objectContaining({ id: rule1.id }),
          expect.objectContaining({ id: rule2.id }),
        ]);
      });
    });

    describe('when deleting a rule', () => {
      const changeProposal = changeProposalFactory({
        type: ChangeProposalType.deleteRule,
        payload: {
          targetId: rule1.id,
          item: rule1,
        },
      });

      it('removes the rule from the rules array', () => {
        const newVersion = applier.applyChangeProposals(standardVersion, [
          changeProposal,
        ]);

        expect(newVersion.rules).toEqual([
          expect.objectContaining({
            id: rule2.id,
            content: rule2.content,
          }),
        ]);
      });
    });

    describe('when applying multiple changes', () => {
      it('applies all changes in sequence', () => {
        const changeProposals = [
          changeProposalFactory({
            type: ChangeProposalType.updateStandardName,
            payload: {
              oldValue: standardVersion.name,
              newValue: 'Updated TypeScript Best Practices',
            },
          }),
          changeProposalFactory({
            type: ChangeProposalType.addRule,
            payload: {
              item: {
                content: 'Use interfaces for object types',
              },
            },
          }),
          changeProposalFactory({
            type: ChangeProposalType.deleteRule,
            payload: {
              targetId: rule1.id,
              item: rule1,
            },
          }),
        ];

        const newVersion = applier.applyChangeProposals(
          standardVersion,
          changeProposals,
        );

        expect(newVersion.name).toBe('Updated TypeScript Best Practices');
        expect(newVersion.rules).toEqual([
          expect.objectContaining({
            id: rule2.id,
            content: rule2.content,
          }),
          expect.objectContaining({
            content: 'Use interfaces for object types',
            standardVersionId: standardVersion.id,
          }),
        ]);
      });
    });

    describe('when encountering an unsupported change type', () => {
      it('throws an error', () => {
        const changeProposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillName,
          payload: {
            oldValue: 'old',
            newValue: 'new',
          },
        });

        expect(() =>
          applier.applyChangeProposals(standardVersion, [changeProposal]),
        ).toThrow('Unsupported ChangeProposalType');
      });
    });
  });

  describe('getVersion', () => {
    it('fetches the latest standard version with rules', async () => {
      const standardId = standardVersion.standardId;
      standardsPort.getLatestStandardVersion = jest
        .fn()
        .mockResolvedValue(standardVersion);
      standardsPort.getRulesByStandardId = jest
        .fn()
        .mockResolvedValue([rule1, rule2]);

      const result = await applier.getVersion(standardId);

      expect(result).toEqual({
        ...standardVersion,
        rules: [rule1, rule2],
      });
      expect(standardsPort.getLatestStandardVersion).toHaveBeenCalledWith(
        standardId,
      );
      expect(standardsPort.getRulesByStandardId).toHaveBeenCalledWith(
        standardId,
      );
    });

    it('throws an error when standard version is not found', async () => {
      const standardId = standardVersion.standardId;
      standardsPort.getLatestStandardVersion = jest
        .fn()
        .mockResolvedValue(null);

      await expect(applier.getVersion(standardId)).rejects.toThrow(
        `Unable to find standard version with id ${standardId}`,
      );
    });
  });

  describe('saveNewVersion', () => {
    it('calls updateStandard and returns the new version with rules', async () => {
      const userId = createUserId('test-user-id');
      const organizationId = createOrganizationId('test-org-id');
      const spaceId = createSpaceId('test-space-id');

      const updatedStandard = {
        id: standardVersion.standardId,
        name: standardVersion.name,
        version: 2,
      };

      const newVersion = {
        ...standardVersion,
        version: 2,
      };

      standardsPort.updateStandard = jest
        .fn()
        .mockResolvedValue(updatedStandard);
      standardsPort.getLatestStandardVersion = jest
        .fn()
        .mockResolvedValue(newVersion);
      standardsPort.getRulesByStandardId = jest
        .fn()
        .mockResolvedValue([rule1, rule2]);

      const result = await applier.saveNewVersion(
        standardVersion,
        userId,
        spaceId,
        organizationId,
      );

      expect(standardsPort.updateStandard).toHaveBeenCalledWith({
        userId,
        organizationId,
        spaceId,
        standardId: standardVersion.standardId,
        name: standardVersion.name,
        description: standardVersion.description,
        rules: [
          { id: rule1.id, content: rule1.content },
          { id: rule2.id, content: rule2.content },
        ],
        scope: standardVersion.scope,
      });

      expect(result).toEqual({
        ...newVersion,
        rules: [rule1, rule2],
      });
    });

    it('throws an error when failed to retrieve the new version', async () => {
      const userId = createUserId('test-user-id');
      const organizationId = createOrganizationId('test-org-id');
      const spaceId = createSpaceId('test-space-id');

      const updatedStandard = {
        id: standardVersion.standardId,
        name: standardVersion.name,
        version: 2,
      };

      standardsPort.updateStandard = jest
        .fn()
        .mockResolvedValue(updatedStandard);
      standardsPort.getLatestStandardVersion = jest
        .fn()
        .mockResolvedValue(null);

      await expect(
        applier.saveNewVersion(
          standardVersion,
          userId,
          spaceId,
          organizationId,
        ),
      ).rejects.toThrow(
        `Failed to retrieve latest version for standard ${updatedStandard.id}`,
      );
    });
  });
});
