import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  ApplyPlaybookCommand,
  ApplyPlaybookResponse,
  ChangeProposalType,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  Organization,
  Recipe,
  RecipeVersion,
  Skill,
  Space,
  Standard,
  StandardVersion,
  User,
  createOrganizationId,
  createRecipeId,
  createRecipeVersionId,
  createRuleId,
  createSkillId,
  createSkillFileId,
  createSkillVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  SkillVersion,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { ApplyPlaybookUseCase } from './ApplyPlaybookUseCase';

describe('ApplyPlaybookUseCase', () => {
  let useCase: ApplyPlaybookUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let result: ApplyPlaybookResponse;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const spaceId2 = createSpaceId(uuidv4());

  const user: User = {
    id: userId,
    email: 'bob@example.com',
    passwordHash: 'hashed',
    memberships: [{ organizationId, role: 'member', userId }],
    active: true,
  };
  const organization: Organization = {
    id: organizationId,
    name: 'Bob Org',
    slug: 'bob-org',
  };
  const space: Space = {
    id: spaceId,
    name: 'Default Space',
    slug: 'default-space',
    organizationId,
  };
  const space2: Space = {
    id: spaceId2,
    name: 'Second Space',
    slug: 'second-space',
    organizationId,
  };

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    skillsPort = {
      uploadSkill: jest.fn().mockResolvedValue({
        skill: { id: createSkillId(uuidv4()), slug: 'my-skill' } as Skill,
        versionCreated: true,
      }),
      hardDeleteSkill: jest.fn().mockResolvedValue(undefined),
      hardDeleteSkillVersion: jest.fn().mockResolvedValue(undefined),
      getLatestSkillVersion: jest.fn(),
      getSkillFiles: jest.fn().mockResolvedValue([]),
      saveSkillVersion: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    standardsPort = {
      createStandardWithExamples: jest.fn().mockResolvedValue({
        id: createStandardId(uuidv4()),
        slug: 'my-standard',
      } as Standard),
      hardDeleteStandard: jest.fn().mockResolvedValue(undefined),
      hardDeleteStandardVersion: jest.fn().mockResolvedValue(undefined),
      getLatestStandardVersion: jest.fn(),
      getRulesByStandardId: jest.fn().mockResolvedValue([]),
      updateStandard: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    recipesPort = {
      captureRecipe: jest.fn().mockResolvedValue({
        id: createRecipeId(uuidv4()),
        slug: 'my-command',
      } as Recipe),
      hardDeleteRecipe: jest.fn().mockResolvedValue(undefined),
      hardDeleteRecipeVersion: jest.fn().mockResolvedValue(undefined),
      getRecipeByIdInternal: jest.fn(),
      getRecipeVersion: jest.fn(),
      updateRecipeFromUI: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    spacesPort = {
      getSpaceById: jest.fn().mockImplementation((id) => {
        if (id === spaceId) return Promise.resolve(space);
        if (id === spaceId2) return Promise.resolve(space2);
        return Promise.resolve(null);
      }),
    } as unknown as jest.Mocked<ISpacesPort>;

    stubbedLogger = stubLogger();

    useCase = new ApplyPlaybookUseCase(
      accountsPort,
      skillsPort,
      standardsPort,
      recipesPort,
      spacesPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function buildCommand(
    overrides: Partial<ApplyPlaybookCommand> = {},
  ): ApplyPlaybookCommand {
    return {
      userId,
      organizationId,
      message: 'Added new artifacts',
      proposals: [],
      ...overrides,
    };
  }

  describe('when all proposals succeed', () => {
    describe('when submitting all artifact types', () => {
      beforeEach(async () => {
        const command = buildCommand({
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createSkill,
              payload: {
                name: 'my-skill',
                description: 'A skill',
                prompt: 'Do things',
                skillMdPermissions: 'rw-r--r--',
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId,
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'my-standard',
                description: 'A standard',
                scope: 'TypeScript',
                rules: [{ content: 'Use const' }],
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId,
              type: ChangeProposalType.createCommand,
              payload: { name: 'my-command', content: 'Do this' },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('creates one skill', () => {
        expect(result.success && result.created.skills).toHaveLength(1);
      });

      it('creates one standard', () => {
        expect(result.success && result.created.standards).toHaveLength(1);
      });

      it('creates one command', () => {
        expect(result.success && result.created.commands).toHaveLength(1);
      });

      it('includes a SKILL.md file in uploadSkill call', () => {
        const callArgs = skillsPort.uploadSkill.mock.calls[0][0];
        const skillMdFile = callArgs.files.find(
          (f: { path: string }) => f.path === 'SKILL.md',
        );
        expect(skillMdFile).toBeDefined();
      });

      it('reconstructs SKILL.md with frontmatter and prompt body', () => {
        const callArgs = skillsPort.uploadSkill.mock.calls[0][0];
        const skillMdFile = callArgs.files.find(
          (f: { path: string }) => f.path === 'SKILL.md',
        );
        expect(skillMdFile.content).toContain('name: my-skill');
      });
    });

    describe('when submitting a skill with optional fields and supporting files', () => {
      beforeEach(async () => {
        const command = buildCommand({
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createSkill,
              payload: {
                name: 'full-skill',
                description: 'A complete skill',
                prompt: 'Full prompt content',
                skillMdPermissions: 'rw-r--r--',
                license: 'MIT',
                compatibility: 'claude-code',
                allowedTools: 'Read,Write',
                metadata: { author: 'test' },
                additionalProperties: { userInvocable: true },
                files: [
                  {
                    path: 'helper.ts',
                    content: 'export const x = 1;',
                    permissions: 'rw-r--r--',
                  },
                ],
              },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('includes license in SKILL.md frontmatter', () => {
        const callArgs = skillsPort.uploadSkill.mock.calls[0][0];
        const skillMdFile = callArgs.files.find(
          (f: { path: string }) => f.path === 'SKILL.md',
        );
        expect(skillMdFile.content).toContain('license: MIT');
      });

      it('includes allowed-tools in SKILL.md frontmatter', () => {
        const callArgs = skillsPort.uploadSkill.mock.calls[0][0];
        const skillMdFile = callArgs.files.find(
          (f: { path: string }) => f.path === 'SKILL.md',
        );
        expect(skillMdFile.content).toContain('allowed-tools: Read,Write');
      });

      it('passes supporting files alongside SKILL.md', () => {
        const callArgs = skillsPort.uploadSkill.mock.calls[0][0];
        expect(callArgs.files).toHaveLength(2);
      });
    });

    describe('when proposals array is empty', () => {
      beforeEach(async () => {
        const command = buildCommand({ proposals: [] });
        result = await useCase.execute(command);
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('returns empty skills array', () => {
        expect(result.success && result.created.skills).toEqual([]);
      });

      it('returns empty standards array', () => {
        expect(result.success && result.created.standards).toEqual([]);
      });

      it('returns empty commands array', () => {
        expect(result.success && result.created.commands).toEqual([]);
      });
    });

    describe('when proposals span multiple spaces', () => {
      beforeEach(async () => {
        const command = buildCommand({
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'std-1',
                description: 'desc',
                scope: null,
                rules: [{ content: 'rule' }],
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId: spaceId2,
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'std-2',
                description: 'desc',
                scope: null,
                rules: [{ content: 'rule' }],
              },
              targetId: createTargetId('target-2'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('validates both spaces', () => {
        expect(spacesPort.getSpaceById).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('when a proposal fails', () => {
    describe('when second of two proposals fails', () => {
      beforeEach(async () => {
        recipesPort.captureRecipe.mockRejectedValueOnce(
          new Error('Duplicate slug'),
        );

        const command = buildCommand({
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createSkill,
              payload: {
                name: 'skill',
                description: 'desc',
                prompt: 'p',
                skillMdPermissions: 'rw-r--r--',
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId,
              type: ChangeProposalType.createCommand,
              payload: { name: 'cmd', content: 'content' },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('returns failure', () => {
        expect(result.success).toBe(false);
      });

      it('reports error at index 1', () => {
        expect(!result.success && result.error.index).toBe(1);
      });

      it('includes the error message', () => {
        expect(!result.success && result.error.message).toBe('Duplicate slug');
      });

      it('hard-deletes the first artifact', () => {
        expect(skillsPort.hardDeleteSkill).toHaveBeenCalledTimes(1);
      });
    });

    describe('when first proposal fails immediately', () => {
      beforeEach(async () => {
        standardsPort.createStandardWithExamples.mockRejectedValueOnce(
          new Error('Validation failed'),
        );

        const command = buildCommand({
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'std',
                description: 'desc',
                scope: null,
                rules: [{ content: 'rule' }],
              },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('reports error at index 0', () => {
        expect(!result.success && result.error.index).toBe(0);
      });

      it('reports the correct proposal type', () => {
        expect(!result.success && result.error.type).toBe(
          ChangeProposalType.createStandard,
        );
      });

      it('includes the error message', () => {
        expect(!result.success && result.error.message).toBe(
          'Validation failed',
        );
      });
    });

    describe('when last of three proposals fails', () => {
      beforeEach(async () => {
        recipesPort.captureRecipe.mockRejectedValueOnce(new Error('fail'));

        const command = buildCommand({
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createSkill,
              payload: {
                name: 'skill',
                description: 'desc',
                prompt: 'p',
                skillMdPermissions: 'rw-r--r--',
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId,
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'std',
                description: 'desc',
                scope: null,
                rules: [{ content: 'rule' }],
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId,
              type: ChangeProposalType.createCommand,
              payload: { name: 'cmd', content: 'content' },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('returns failure', () => {
        expect(result.success).toBe(false);
      });

      it('hard-deletes the created skill', () => {
        expect(skillsPort.hardDeleteSkill).toHaveBeenCalledTimes(1);
      });

      it('hard-deletes the created standard', () => {
        expect(standardsPort.hardDeleteStandard).toHaveBeenCalledTimes(1);
      });
    });

    describe('when second of three proposals fails', () => {
      beforeEach(async () => {
        standardsPort.createStandardWithExamples.mockRejectedValueOnce(
          new Error('creation failed on second'),
        );

        const command = buildCommand({
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createSkill,
              payload: {
                name: 'skill',
                description: 'desc',
                prompt: 'p',
                skillMdPermissions: 'rw-r--r--',
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId,
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'std',
                description: 'desc',
                scope: null,
                rules: [{ content: 'rule' }],
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId,
              type: ChangeProposalType.createCommand,
              payload: { name: 'cmd', content: 'content' },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('reports error at index 1', () => {
        expect(!result.success && result.error.index).toBe(1);
      });

      it('reports the correct proposal type', () => {
        expect(!result.success && result.error.type).toBe(
          ChangeProposalType.createStandard,
        );
      });

      it('hard-deletes the first artifact', () => {
        expect(skillsPort.hardDeleteSkill).toHaveBeenCalledTimes(1);
      });

      it('never attempts to create the third artifact', () => {
        expect(recipesPort.captureRecipe).not.toHaveBeenCalled();
      });
    });

    describe('when rollback hard-delete fails', () => {
      beforeEach(async () => {
        recipesPort.captureRecipe.mockRejectedValueOnce(
          new Error('creation failed'),
        );
        skillsPort.hardDeleteSkill.mockRejectedValueOnce(
          new Error('rollback failed'),
        );

        const command = buildCommand({
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createSkill,
              payload: {
                name: 'skill',
                description: 'desc',
                prompt: 'p',
                skillMdPermissions: 'rw-r--r--',
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId,
              type: ChangeProposalType.createCommand,
              payload: { name: 'cmd', content: 'content' },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('returns the original creation error', () => {
        expect(!result.success && result.error.message).toBe('creation failed');
      });
    });
  });

  describe('space validation', () => {
    describe('when space does not belong to organization', () => {
      beforeEach(async () => {
        const otherOrgId = createOrganizationId(uuidv4());
        const wrongSpace: Space = {
          id: spaceId,
          name: 'Wrong',
          slug: 'wrong',
          organizationId: otherOrgId,
        };
        spacesPort.getSpaceById.mockResolvedValueOnce(wrongSpace);

        const command = buildCommand({
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'std',
                description: 'desc',
                scope: null,
                rules: [{ content: 'rule' }],
              },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('returns a structured error', () => {
        expect(result.success).toBe(false);
      });

      it('includes space not found message', () => {
        expect(!result.success && result.error.message).toContain(
          'not found or does not belong to organization',
        );
      });

      it('does not attempt to create artifacts', () => {
        expect(standardsPort.createStandardWithExamples).not.toHaveBeenCalled();
      });
    });

    describe('when space does not exist', () => {
      beforeEach(async () => {
        const missingSpaceId = createSpaceId(uuidv4());
        spacesPort.getSpaceById.mockResolvedValueOnce(null);

        const command = buildCommand({
          proposals: [
            {
              spaceId: missingSpaceId,
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'std',
                description: 'desc',
                scope: null,
                rules: [{ content: 'rule' }],
              },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('returns a structured error', () => {
        expect(result.success).toBe(false);
      });

      it('includes space not found message', () => {
        expect(!result.success && result.error.message).toContain(
          'not found or does not belong to organization',
        );
      });

      it('does not attempt to create artifacts', () => {
        expect(standardsPort.createStandardWithExamples).not.toHaveBeenCalled();
      });
    });
  });

  describe('update proposals', () => {
    const stdId = createStandardId('existing-std');
    const stdVersionId = createStandardVersionId('std-ver-1');
    const newStdVersionId = createStandardVersionId('std-ver-2');
    const ruleId = createRuleId('rule-1');

    const stdVersion: StandardVersion = {
      id: stdVersionId,
      standardId: stdId,
      name: 'Old Name',
      slug: 'old-name',
      description: 'Old desc',
      version: 1,
      scope: null,
      rules: [
        { id: ruleId, standardVersionId: stdVersionId, content: 'Use const' },
      ],
    };

    const newStdVersion: StandardVersion = {
      ...stdVersion,
      id: newStdVersionId,
      name: 'New Name',
      version: 2,
    };

    const recipeId = createRecipeId('existing-recipe');
    const recipeVersionId = createRecipeVersionId('recipe-ver-1');
    const newRecipeVersionId = createRecipeVersionId('recipe-ver-2');

    const recipe: Recipe = {
      id: recipeId,
      name: 'My Command',
      slug: 'my-command',
      version: 1,
      spaceId,
      organizationId,
    } as Recipe;

    const recipeVersion: RecipeVersion = {
      id: recipeVersionId,
      recipeId,
      name: 'My Command',
      slug: 'my-command',
      content: 'Do this',
      version: 1,
      userId,
    };

    const newRecipeVersion: RecipeVersion = {
      ...recipeVersion,
      id: newRecipeVersionId,
      name: 'New Command',
      version: 2,
    };

    describe('when submitting a single update proposal', () => {
      beforeEach(async () => {
        standardsPort.getLatestStandardVersion.mockResolvedValue(stdVersion);
        standardsPort.getRulesByStandardId.mockResolvedValue(
          stdVersion.rules ?? [],
        );
        standardsPort.updateStandard.mockResolvedValue({
          id: stdId,
        } as Standard);
        standardsPort.getLatestStandardVersion
          .mockResolvedValueOnce(stdVersion)
          .mockResolvedValueOnce(newStdVersion);
        standardsPort.getRulesByStandardId
          .mockResolvedValueOnce(stdVersion.rules ?? [])
          .mockResolvedValueOnce(newStdVersion.rules ?? []);

        result = await useCase.execute(
          buildCommand({
            proposals: [
              {
                spaceId,
                type: ChangeProposalType.updateStandardName,
                artefactId: stdId,
                payload: { oldValue: 'Old Name', newValue: 'New Name' },
                targetId: createTargetId('t-1'),
              },
            ],
          }),
        );
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('includes the standard in updated list', () => {
        expect(result.success && result.updated.standards).toEqual([stdId]);
      });

      it('returns empty created lists', () => {
        expect(result.success && result.created.standards).toEqual([]);
      });
    });

    describe('when submitting multiple updates on the same artifact', () => {
      beforeEach(async () => {
        standardsPort.getLatestStandardVersion
          .mockResolvedValueOnce(stdVersion)
          .mockResolvedValueOnce(newStdVersion);
        standardsPort.getRulesByStandardId
          .mockResolvedValueOnce(stdVersion.rules ?? [])
          .mockResolvedValueOnce(newStdVersion.rules ?? []);
        standardsPort.updateStandard.mockResolvedValue({
          id: stdId,
        } as Standard);

        result = await useCase.execute(
          buildCommand({
            proposals: [
              {
                spaceId,
                type: ChangeProposalType.updateStandardName,
                artefactId: stdId,
                payload: { oldValue: 'Old Name', newValue: 'New Name' },
              },
              {
                spaceId,
                type: ChangeProposalType.updateStandardScope,
                artefactId: stdId,
                payload: { oldValue: '', newValue: 'TypeScript' },
              },
            ],
          }),
        );
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('calls updateStandard only once (grouped)', () => {
        expect(standardsPort.updateStandard).toHaveBeenCalledTimes(1);
      });

      it('includes the standard in updated list once', () => {
        expect(result.success && result.updated.standards).toEqual([stdId]);
      });
    });

    describe('when submitting a mixed batch (create + update)', () => {
      beforeEach(async () => {
        recipesPort.getRecipeByIdInternal.mockResolvedValue(recipe);
        recipesPort.getRecipeVersion.mockResolvedValue(recipeVersion);
        recipesPort.updateRecipeFromUI.mockResolvedValue({
          recipe: { ...recipe, version: 2 },
        });
        recipesPort.getRecipeVersion
          .mockResolvedValueOnce(recipeVersion)
          .mockResolvedValueOnce(newRecipeVersion);

        result = await useCase.execute(
          buildCommand({
            proposals: [
              {
                spaceId,
                type: ChangeProposalType.createStandard,
                artefactId: null,
                payload: {
                  name: 'new-std',
                  description: 'desc',
                  scope: null,
                  rules: [{ content: 'rule' }],
                },
                targetId: createTargetId('t-1'),
              },
              {
                spaceId,
                type: ChangeProposalType.updateCommandName,
                artefactId: recipeId,
                payload: { oldValue: 'My Command', newValue: 'New Command' },
              },
            ],
          }),
        );
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('has one created standard', () => {
        expect(result.success && result.created.standards).toHaveLength(1);
      });

      it('has one updated command', () => {
        expect(result.success && result.updated.commands).toEqual([recipeId]);
      });
    });

    describe('when an update fails after a successful create', () => {
      beforeEach(async () => {
        standardsPort.getLatestStandardVersion.mockRejectedValue(
          new Error('Version not found'),
        );

        result = await useCase.execute(
          buildCommand({
            proposals: [
              {
                spaceId,
                type: ChangeProposalType.createSkill,
                artefactId: null,
                payload: {
                  name: 'skill',
                  description: 'desc',
                  prompt: 'p',
                  skillMdPermissions: 'rw-r--r--',
                },
                targetId: createTargetId('t-1'),
              },
              {
                spaceId,
                type: ChangeProposalType.updateStandardName,
                artefactId: stdId,
                payload: { oldValue: 'Old', newValue: 'New' },
              },
            ],
          }),
        );
      });

      it('returns failure', () => {
        expect(result.success).toBe(false);
      });

      it('hard-deletes the created skill', () => {
        expect(skillsPort.hardDeleteSkill).toHaveBeenCalledTimes(1);
      });
    });

    describe('when a create fails after a successful update', () => {
      beforeEach(async () => {
        standardsPort.getLatestStandardVersion
          .mockResolvedValueOnce(stdVersion)
          .mockResolvedValueOnce(newStdVersion);
        standardsPort.getRulesByStandardId
          .mockResolvedValueOnce(stdVersion.rules ?? [])
          .mockResolvedValueOnce(newStdVersion.rules ?? []);
        standardsPort.updateStandard.mockResolvedValue({
          id: stdId,
        } as Standard);

        recipesPort.captureRecipe.mockRejectedValue(new Error('create failed'));

        result = await useCase.execute(
          buildCommand({
            proposals: [
              {
                spaceId,
                type: ChangeProposalType.updateStandardName,
                artefactId: stdId,
                payload: { oldValue: 'Old Name', newValue: 'New Name' },
              },
              {
                spaceId,
                type: ChangeProposalType.createCommand,
                artefactId: null,
                payload: { name: 'cmd', content: 'content' },
                targetId: createTargetId('t-1'),
              },
            ],
          }),
        );
      });

      it('returns failure', () => {
        expect(result.success).toBe(false);
      });

      it('hard-deletes the new standard version', () => {
        expect(standardsPort.hardDeleteStandardVersion).toHaveBeenCalledWith(
          newStdVersionId,
        );
      });
    });

    describe('when rollback of version delete fails', () => {
      beforeEach(async () => {
        standardsPort.getLatestStandardVersion
          .mockResolvedValueOnce(stdVersion)
          .mockResolvedValueOnce(newStdVersion);
        standardsPort.getRulesByStandardId
          .mockResolvedValueOnce(stdVersion.rules ?? [])
          .mockResolvedValueOnce(newStdVersion.rules ?? []);
        standardsPort.updateStandard.mockResolvedValue({
          id: stdId,
        } as Standard);
        standardsPort.hardDeleteStandardVersion.mockRejectedValue(
          new Error('rollback failed'),
        );

        recipesPort.captureRecipe.mockRejectedValue(
          new Error('original error'),
        );

        result = await useCase.execute(
          buildCommand({
            proposals: [
              {
                spaceId,
                type: ChangeProposalType.updateStandardName,
                artefactId: stdId,
                payload: { oldValue: 'Old Name', newValue: 'New Name' },
              },
              {
                spaceId,
                type: ChangeProposalType.createCommand,
                artefactId: null,
                payload: { name: 'cmd', content: 'content' },
                targetId: createTargetId('t-1'),
              },
            ],
          }),
        );
      });

      it('returns the original error', () => {
        expect(!result.success && result.error.message).toBe('original error');
      });
    });

    describe('when submitting a deleteSkillFile proposal', () => {
      const skillId = createSkillId('existing-skill');
      const skillVersionId = createSkillVersionId('skill-ver-1');
      const newSkillVersionId = createSkillVersionId('skill-ver-2');
      const fileId = createSkillFileId('file-to-delete');
      const keptFileId = createSkillFileId('kept-file');

      const skillVersion: SkillVersion = {
        id: skillVersionId,
        skillId,
        name: 'My Skill',
        slug: 'my-skill',
        description: 'A skill',
        prompt: 'Do things',
        version: 1,
        userId,
      };

      beforeEach(async () => {
        skillsPort.getLatestSkillVersion.mockResolvedValue(skillVersion);
        skillsPort.getSkillFiles.mockResolvedValue([
          {
            id: fileId,
            skillVersionId,
            path: 'agents/helper.md',
            content: 'helper content',
            permissions: 'rw-r--r--',
            isBase64: false,
          },
          {
            id: keptFileId,
            skillVersionId,
            path: 'SKILL.md',
            content: 'skill content',
            permissions: 'rw-r--r--',
            isBase64: false,
          },
        ]);
        skillsPort.saveSkillVersion.mockResolvedValue({
          ...skillVersion,
          id: newSkillVersionId,
          version: 2,
        });

        result = await useCase.execute(
          buildCommand({
            proposals: [
              {
                spaceId,
                type: ChangeProposalType.deleteSkillFile,
                artefactId: skillId,
                payload: {
                  targetId: fileId,
                  item: {
                    id: fileId,
                    path: 'agents/helper.md',
                    content: 'helper content',
                    permissions: 'rw-r--r--',
                    isBase64: false,
                  },
                },
              },
            ],
          }),
        );
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('includes the skill in updated list', () => {
        expect(result.success && result.updated.skills).toEqual([skillId]);
      });

      it('saves a new version without the deleted file', () => {
        const savedFiles =
          skillsPort.saveSkillVersion.mock.calls[0][0].skillVersion.files;
        expect(savedFiles).toEqual([
          expect.objectContaining({ path: 'SKILL.md' }),
        ]);
      });
    });

    describe('when submitting a deleteRule proposal', () => {
      const ruleToDelete = createRuleId('rule-to-delete');
      const stdVersionWithTwoRules: StandardVersion = {
        ...stdVersion,
        rules: [
          { id: ruleId, standardVersionId: stdVersionId, content: 'Use const' },
          {
            id: ruleToDelete,
            standardVersionId: stdVersionId,
            content: 'No var',
          },
        ],
      };

      beforeEach(async () => {
        standardsPort.getLatestStandardVersion
          .mockResolvedValueOnce(stdVersionWithTwoRules)
          .mockResolvedValueOnce(newStdVersion);
        standardsPort.getRulesByStandardId
          .mockResolvedValueOnce(stdVersionWithTwoRules.rules ?? [])
          .mockResolvedValueOnce(newStdVersion.rules ?? []);
        standardsPort.updateStandard.mockResolvedValue({
          id: stdId,
        } as Standard);

        result = await useCase.execute(
          buildCommand({
            proposals: [
              {
                spaceId,
                type: ChangeProposalType.deleteRule,
                artefactId: stdId,
                payload: {
                  targetId: ruleToDelete,
                  item: { id: ruleToDelete, content: 'No var' },
                },
              },
            ],
          }),
        );
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('includes the standard in updated list', () => {
        expect(result.success && result.updated.standards).toEqual([stdId]);
      });

      it('calls updateStandard with only the remaining rule', () => {
        expect(standardsPort.updateStandard).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [{ id: ruleId, content: 'Use const' }],
          }),
        );
      });
    });
  });

  describe('remove proposal types', () => {
    describe('when submitting only remove proposals', () => {
      const stdId = createStandardId('existing-std');
      const recipeId = createRecipeId('existing-recipe');
      const skillId = createSkillId('existing-skill');

      beforeEach(async () => {
        result = await useCase.execute(
          buildCommand({
            proposals: [
              {
                spaceId,
                type: ChangeProposalType.removeStandard,
                artefactId: stdId,
                payload: {},
              },
              {
                spaceId,
                type: ChangeProposalType.removeCommand,
                artefactId: recipeId,
                payload: {},
              },
              {
                spaceId,
                type: ChangeProposalType.removeSkill,
                artefactId: skillId,
                payload: {},
              },
            ],
          }),
        );
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('returns no created artifacts', () => {
        expect(result.success && result.created).toEqual({
          standards: [],
          commands: [],
          skills: [],
        });
      });

      it('returns no updated artifacts', () => {
        expect(result.success && result.updated).toEqual({
          standards: [],
          commands: [],
          skills: [],
        });
      });

      it('does not delete standard', () => {
        expect(standardsPort.hardDeleteStandard).not.toHaveBeenCalled();
      });

      it('does not delete recipe', () => {
        expect(recipesPort.hardDeleteRecipe).not.toHaveBeenCalled();
      });

      it('does not delete skill', () => {
        expect(skillsPort.hardDeleteSkill).not.toHaveBeenCalled();
      });
    });

    describe('when mixing remove proposals with create proposals', () => {
      const stdId = createStandardId('existing-std');

      beforeEach(async () => {
        result = await useCase.execute(
          buildCommand({
            proposals: [
              {
                spaceId,
                type: ChangeProposalType.removeStandard,
                artefactId: stdId,
                payload: {},
              },
              {
                spaceId,
                type: ChangeProposalType.createSkill,
                payload: {
                  name: 'new-skill',
                  description: 'A skill',
                  prompt: 'Do things',
                  skillMdPermissions: 'rw-r--r--',
                },
                targetId: createTargetId('target-1'),
              },
            ],
          }),
        );
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('creates the skill', () => {
        expect(result.success && result.created.skills).toHaveLength(1);
      });

      it('does not delete the standard', () => {
        expect(standardsPort.hardDeleteStandard).not.toHaveBeenCalled();
      });
    });
  });

  describe('directUpdate forwarding', () => {
    describe('when directUpdate is true', () => {
      beforeEach(async () => {
        const command = buildCommand({
          directUpdate: true,
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createSkill,
              payload: {
                name: 'skill',
                description: 'desc',
                prompt: 'p',
                skillMdPermissions: 'rw-r--r--',
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId,
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'std',
                description: 'desc',
                scope: null,
                rules: [{ content: 'rule' }],
              },
              targetId: createTargetId('target-1'),
            },
            {
              spaceId,
              type: ChangeProposalType.createCommand,
              payload: { name: 'cmd', content: 'content' },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('forwards directUpdate to uploadSkill', () => {
        expect(skillsPort.uploadSkill.mock.calls[0][0]).toHaveProperty(
          'directUpdate',
          true,
        );
      });

      it('forwards directUpdate to createStandardWithExamples', () => {
        expect(
          standardsPort.createStandardWithExamples.mock.calls[0][0],
        ).toHaveProperty('directUpdate', true);
      });

      it('forwards directUpdate to captureRecipe', () => {
        expect(recipesPort.captureRecipe.mock.calls[0][0]).toHaveProperty(
          'directUpdate',
          true,
        );
      });
    });

    describe('when directUpdate is not set', () => {
      beforeEach(async () => {
        const command = buildCommand({
          proposals: [
            {
              spaceId,
              type: ChangeProposalType.createSkill,
              payload: {
                name: 'skill',
                description: 'desc',
                prompt: 'p',
                skillMdPermissions: 'rw-r--r--',
              },
              targetId: createTargetId('target-1'),
            },
          ],
        });

        result = await useCase.execute(command);
      });

      it('does not include directUpdate in uploadSkill', () => {
        expect(skillsPort.uploadSkill.mock.calls[0][0]).not.toHaveProperty(
          'directUpdate',
        );
      });
    });
  });
});
