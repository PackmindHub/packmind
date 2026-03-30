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
  Skill,
  Space,
  Standard,
  User,
  createOrganizationId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createTargetId,
  createUserId,
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    skillsPort = {
      uploadSkill: jest.fn().mockResolvedValue({
        skill: { id: createSkillId(uuidv4()) } as Skill,
        versionCreated: true,
      }),
      hardDeleteSkill: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ISkillsPort>;

    standardsPort = {
      createStandardWithExamples: jest.fn().mockResolvedValue({
        id: createStandardId(uuidv4()),
      } as Standard),
      hardDeleteStandard: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IStandardsPort>;

    recipesPort = {
      captureRecipe: jest.fn().mockResolvedValue({
        id: createRecipeId(uuidv4()),
      } as Recipe),
      hardDeleteRecipe: jest.fn().mockResolvedValue(undefined),
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
                files: [
                  {
                    path: 'SKILL.md',
                    content: 'skill content',
                    permissions: 'rw-r--r--',
                  },
                ],
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
});
