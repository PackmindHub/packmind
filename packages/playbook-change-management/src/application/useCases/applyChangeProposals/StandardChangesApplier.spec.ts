import { standardVersionFactory, ruleFactory } from '@packmind/standards/test';
import {
  ChangeProposalType,
  createChangeProposalId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  IStandardsPort,
  ChangeProposal,
  DiffService,
  ChangeProposalConflictError,
} from '@packmind/types';
import { changeProposalFactory } from '../../../../test';
import { StandardChangesApplier } from './StandardChangesApplier';

describe('StandardChangesApplier', () => {
  let applier: StandardChangesApplier;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let diffService: DiffService;

  beforeEach(() => {
    diffService = new DiffService();
    standardsPort = {
      getLatestStandardVersion: jest.fn(),
      getRulesByStandardId: jest.fn(),
      updateStandard: jest.fn(),
      deleteStandard: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    applier = new StandardChangesApplier(diffService, standardsPort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const rule1 = ruleFactory({
    content: 'Always use TypeScript for new files',
  });

  const rule2 = ruleFactory({
    content: 'Use const for variables that do not change',
  });

  const standardVersion = standardVersionFactory({
    name: 'TypeScript Best Practices',
    scope: '**/*.ts',
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
          type: ChangeProposalType.updateStandardScope,
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

        expect(newStandardVersion.version).toEqual({
          ...standardVersion,
          name: `${standardVersion.name}--after`,
        });
      });
    });

    describe('when updating the standard scope', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateStandardScope,
          payload: {
            oldValue: standardVersion.name,
            newValue: `**/*.spec.ts`,
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateStandardScope,
          payload: {
            oldValue: standardVersion.name,
            newValue: `**/*.test.ts`,
          },
        }),
      ];

      it('overrides the standard scope with each proposal', () => {
        const newStandardVersion = applier.applyChangeProposals(
          standardVersion,
          changeProposals,
        );

        expect(newStandardVersion.version).toEqual({
          ...standardVersion,
          scope: `**/*.test.ts`,
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

        expect(newVersion.version).toEqual({
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

        expect(newVersion.version.rules).toEqual([
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

        expect(newVersion.version.rules).toEqual([
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

        expect(newVersion.version.rules).toEqual([
          expect.objectContaining({ content: updatedContent }),
          expect.objectContaining({ content: rule2.content }),
        ]);
      });

      it('preserves the rule ID', () => {
        const newVersion = applier.applyChangeProposals(standardVersion, [
          changeProposal,
        ]);

        expect(newVersion.version.rules).toEqual([
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

        expect(newVersion.version.rules).toEqual([
          expect.objectContaining({
            id: rule2.id,
            content: rule2.content,
          }),
        ]);
      });
    });

    describe('when applying multiple changes', () => {
      let changeProposals: ChangeProposal[];

      beforeEach(() => {
        changeProposals = [
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
      });

      it('updates the standard name', () => {
        const newVersion = applier.applyChangeProposals(
          standardVersion,
          changeProposals,
        );

        expect(newVersion.version.name).toBe(
          'Updated TypeScript Best Practices',
        );
      });

      it('applies all rule changes correctly', () => {
        const newVersion = applier.applyChangeProposals(
          standardVersion,
          changeProposals,
        );

        expect(newVersion.version.rules).toEqual([
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
      it('returns source unchanged', () => {
        const changeProposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillName,
          payload: {
            oldValue: 'old',
            newValue: 'new',
          },
        });

        const result = applier.applyChangeProposals(standardVersion, [
          changeProposal,
        ]);

        expect(result.version).toEqual(standardVersion);
      });
    });
  });

  describe('getVersion', () => {
    const standardId = standardVersion.standardId;

    beforeEach(() => {
      standardsPort.getLatestStandardVersion.mockResolvedValue(
        standardVersion as never,
      );
      standardsPort.getRulesByStandardId.mockResolvedValue([rule1, rule2]);
    });

    it('returns the standard version with rules', async () => {
      const result = await applier.getVersion(standardId);

      expect(result).toEqual({
        ...standardVersion,
        rules: [rule1, rule2],
      });
    });

    it('calls getLatestStandardVersion with standardId', async () => {
      await applier.getVersion(standardId);

      expect(standardsPort.getLatestStandardVersion).toHaveBeenCalledWith(
        standardId,
      );
    });

    it('calls getRulesByStandardId with standardId', async () => {
      await applier.getVersion(standardId);

      expect(standardsPort.getRulesByStandardId).toHaveBeenCalledWith(
        standardId,
      );
    });

    describe('when standard version is not found', () => {
      it('throws an error', async () => {
        const standardId = standardVersion.standardId;
        standardsPort.getLatestStandardVersion.mockResolvedValue(null as never);

        await expect(applier.getVersion(standardId)).rejects.toThrow(
          `Unable to find standard version with id ${standardId}`,
        );
      });
    });
  });

  describe('saveNewVersion', () => {
    const userId = createUserId('test-user-id');
    const organizationId = createOrganizationId('test-org-id');
    const spaceId = createSpaceId('test-space-id');

    beforeEach(() => {
      const updatedStandard = {
        id: standardVersion.standardId,
        name: standardVersion.name,
        version: 2,
      };

      const newVersion = {
        ...standardVersion,
        version: 2,
      };

      standardsPort.updateStandard.mockResolvedValue(updatedStandard as never);
      standardsPort.getLatestStandardVersion.mockResolvedValue(
        newVersion as never,
      );
      standardsPort.getRulesByStandardId.mockResolvedValue([rule1, rule2]);
    });

    it('calls updateStandard with correct parameters', async () => {
      await applier.saveNewVersion(
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
    });

    it('returns the new version with rules', async () => {
      const result = await applier.saveNewVersion(
        standardVersion,
        userId,
        spaceId,
        organizationId,
      );

      const newVersion = {
        ...standardVersion,
        version: 2,
      };

      expect(result).toEqual({
        ...newVersion,
        rules: [rule1, rule2],
      });
    });

    describe('when failed to retrieve the new version', () => {
      it('throws an error', async () => {
        const updatedStandard = {
          id: standardVersion.standardId,
          name: standardVersion.name,
          version: 2,
        };

        standardsPort.updateStandard.mockResolvedValue(
          updatedStandard as never,
        );
        standardsPort.getLatestStandardVersion.mockResolvedValue(null as never);

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

  describe('deleteArtefact', () => {
    const userId = createUserId('user-id');
    const spaceId = createSpaceId('space-id');
    const organizationId = createOrganizationId('organization-id');

    beforeEach(() => {
      standardsPort.deleteStandard.mockResolvedValue(undefined as never);
    });

    it('calls deleteStandard with the standard ID and auth context', async () => {
      await applier.deleteArtefact(
        standardVersion,
        userId,
        spaceId,
        organizationId,
      );

      expect(standardsPort.deleteStandard).toHaveBeenCalledWith({
        standardId: standardVersion.standardId,
        userId,
        organizationId,
        spaceId,
      });
    });
  });

  describe('getUpdatePackageCommandWithoutArtefact', () => {
    it('removes the standard from the package standard list', () => {
      const otherStandardId = createStandardId('other-standard');
      const recipeId = createRecipeId('recipe-1');
      const skillId = createSkillId('skill-1');
      const pkg = {
        id: createPackageId('pkg-1'),
        name: 'My Package',
        slug: 'my-package',
        description: 'desc',
        spaceId: createSpaceId('space-1'),
        createdBy: createUserId('user-1'),
        recipes: [recipeId],
        standards: [standardVersion.standardId, otherStandardId],
        skills: [skillId],
      };

      const result = applier.getUpdatePackageCommandWithoutArtefact(
        standardVersion,
        pkg,
      );

      expect(result).toEqual({
        recipeIds: [recipeId],
        standardIds: [otherStandardId],
        skillsIds: [skillId],
      });
    });
  });
});
