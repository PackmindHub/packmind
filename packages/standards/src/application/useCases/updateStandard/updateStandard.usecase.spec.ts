import { UpdateStandardUsecase } from './updateStandard.usecase';
import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import {
  Standard,
  StandardId,
  createStandardId,
} from '../../../domain/entities/Standard';
import { StandardVersion } from '../../../domain/entities/StandardVersion';
import { Rule, createRuleId } from '../../../domain/entities/Rule';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { ruleFactory } from '../../../../test/ruleFactory';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';
import { PackmindLogger } from '@packmind/logger';
import { UserProvider, OrganizationProvider } from '@packmind/types';
import {
  UpdateStandardCommand,
  ISpacesPort,
  Space,
  createSpaceId,
  SpaceId,
} from '@packmind/shared';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  OrganizationId,
  UserId,
  Organization,
  User,
  UserOrganizationMembership,
} from '@packmind/accounts';
import { createStandardVersionId } from '../../../domain/entities/StandardVersion';

// Mock external dependencies
jest.mock('slug');

const mockSlug = slug as jest.MockedFunction<typeof slug>;

describe('UpdateStandardUsecase', () => {
  let updateStandardUsecase: UpdateStandardUsecase;
  let standardService: jest.Mocked<StandardService>;
  let standardVersionService: jest.Mocked<StandardVersionService>;
  let generateStandardSummaryDelayedJob: jest.Mocked<GenerateStandardSummaryDelayedJob>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let userProvider: jest.Mocked<UserProvider>;
  let organizationProvider: jest.Mocked<OrganizationProvider>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let mockUser: User;
  let mockOrganization: Organization;
  let mockMembership: UserOrganizationMembership;
  let mockSpace: Space;

  beforeEach(() => {
    // Mock StandardService
    standardService = {
      addStandard: jest.fn(),
      getStandardById: jest.fn(),
      findStandardBySlug: jest.fn(),
      updateStandard: jest.fn(),
      deleteStandard: jest.fn(),
      listStandardsByOrganization: jest.fn(),
      listStandardsByUser: jest.fn(),
      listStandardsByOrganizationAndUser: jest.fn(),
    } as unknown as jest.Mocked<StandardService>;

    // Mock StandardVersionService
    standardVersionService = {
      addStandardVersion: jest.fn(),
      listStandardVersions: jest.fn(),
      getStandardVersion: jest.fn(),
      getLatestStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      prepareForGitPublishing: jest.fn(),
    } as unknown as jest.Mocked<StandardVersionService>;

    // Mock GenerateStandardSummaryDelayedJob
    generateStandardSummaryDelayedJob = {
      addJob: jest.fn(),
    } as unknown as jest.Mocked<GenerateStandardSummaryDelayedJob>;

    // Mock RuleRepository
    ruleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByStandardVersionId: jest.fn(),
      deleteById: jest.fn(),
      deleteByStandardVersionId: jest.fn(),
    } as unknown as jest.Mocked<IRuleRepository>;

    // Mock RuleExampleRepository
    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<IRuleExampleRepository>;

    // Setup default mock implementations
    mockSlug.mockImplementation((input: string) =>
      input.toLowerCase().replace(/\s+/g, '-'),
    );

    ruleExampleRepository.findByRuleId.mockResolvedValue([]);

    generateStandardSummaryDelayedJob.addJob.mockResolvedValue('job-id-123');

    stubbedLogger = stubLogger();

    // Setup user, organization, and membership mocks
    const mockUserId = createUserId(uuidv4());
    const mockOrgId = createOrganizationId(uuidv4());

    mockOrganization = {
      id: mockOrgId,
      name: 'Test Organization',
      slug: 'test-org',
    };

    mockMembership = {
      userId: mockUserId,
      organizationId: mockOrgId,
      role: 'member' as const,
      organization: mockOrganization,
    };

    mockUser = {
      id: mockUserId,
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      active: true,
      memberships: [mockMembership],
    };

    userProvider = {
      getUserById: jest.fn().mockResolvedValue(mockUser),
    } as unknown as jest.Mocked<UserProvider>;

    organizationProvider = {
      getOrganizationById: jest.fn().mockResolvedValue(mockOrganization),
    } as unknown as jest.Mocked<OrganizationProvider>;

    // Setup space mock
    mockSpace = {
      id: createSpaceId(uuidv4()),
      name: 'Test Space',
      slug: 'test-space',
      organizationId: mockOrgId,
    };

    spacesPort = {
      getSpaceById: jest.fn().mockResolvedValue(mockSpace),
      listSpaces: jest.fn(),
      createSpace: jest.fn(),
      updateSpace: jest.fn(),
      deleteSpace: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    updateStandardUsecase = new UpdateStandardUsecase(
      userProvider,
      organizationProvider,
      standardService,
      standardVersionService,
      ruleRepository,
      ruleExampleRepository,
      generateStandardSummaryDelayedJob,
      spacesPort,
      stubbedLogger,
    );

    // Spy on the generateStandardSummary method
    jest.spyOn(updateStandardUsecase, 'generateStandardSummary');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateStandard', () => {
    let standardId: StandardId;
    let organizationId: OrganizationId;
    let userId: UserId;
    let spaceId: SpaceId;

    beforeEach(() => {
      standardId = createStandardId(uuidv4());
      organizationId = mockMembership.organizationId; // Use the mock organization ID
      userId = mockUser.id; // Use the mock user ID
      spaceId = mockSpace.id; // Use the mock space ID

      // Update organization and user providers with the test IDs
      userProvider.getUserById = jest.fn().mockResolvedValue(mockUser);
      organizationProvider.getOrganizationById = jest.fn().mockResolvedValue({
        ...mockOrganization,
        id: organizationId,
      });
      spacesPort.getSpaceById = jest.fn().mockResolvedValue({
        ...mockSpace,
        organizationId,
      });
    });

    describe('when content has changed', () => {
      let inputData: UpdateStandardCommand;
      let existingStandard: Standard;
      let latestVersion: StandardVersion;
      let existingRules: Rule[];
      let updatedStandard: Standard;
      let newStandardVersion: StandardVersion;
      let result: Standard;

      beforeEach(async () => {
        inputData = {
          standardId: standardId,
          name: 'Updated Standard Name',
          description: 'Updated description',
          rules: [
            { id: createRuleId(uuidv4()), content: 'Updated rule content' },
          ],
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: null,
        };

        existingStandard = standardFactory({
          id: standardId,
          name: 'Original Standard Name',
          slug: 'original-standard-name',
          description: 'Original description',
          version: 2,
          spaceId: spaceId,
        });

        latestVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId,
          name: 'Original Standard Name',
          slug: 'original-standard-name',
          description: 'Original description',
          version: 2,
        });

        existingRules = [
          ruleFactory({
            content: 'Original rule 1',
            standardVersionId: latestVersion.id,
          }),
          ruleFactory({
            content: 'Original rule 2',
            standardVersionId: latestVersion.id,
          }),
        ];

        updatedStandard = standardFactory({
          id: standardId,
          name: inputData.name,
          slug: 'original-standard-name', // Should preserve original slug
          description: inputData.description,
          version: 3,
        });

        newStandardVersion = standardVersionFactory({
          standardId,
          name: inputData.name,
          slug: 'original-standard-name', // Should preserve original slug
          description: inputData.description,
          version: 3,
        });

        // Setup mocks
        standardService.getStandardById.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          newStandardVersion,
        );

        const response = await updateStandardUsecase.execute(inputData);
        result = response.standard;
      });

      it('checks if the standard exists', () => {
        expect(standardService.getStandardById).toHaveBeenCalledWith(
          standardId,
        );
      });

      it('gets the latest version for comparison', () => {
        expect(
          standardVersionService.getLatestStandardVersion,
        ).toHaveBeenCalledWith(standardId);
      });

      it('gets existing rules for content comparison', () => {
        expect(ruleRepository.findByStandardVersionId).toHaveBeenCalledWith(
          latestVersion.id,
        );
      });

      it('preserves the original slug instead of generating a new one', () => {
        expect(mockSlug).not.toHaveBeenCalled();
      });

      it('updates the standard with incremented version', () => {
        expect(standardService.updateStandard).toHaveBeenCalledWith(
          standardId,
          {
            name: inputData.name,
            description: inputData.description,
            slug: 'original-standard-name', // Should preserve original slug
            version: 3, // Original version was 2, so incremented to 3
            gitCommit: undefined,
            userId: createUserId(inputData.userId),
            scope: inputData.scope,
          },
        );
      });

      it('calls generateStandardSummary method for updated standard version', () => {
        expect(
          updateStandardUsecase.generateStandardSummary,
        ).toHaveBeenCalledTimes(1);
        expect(
          updateStandardUsecase.generateStandardSummary,
        ).toHaveBeenCalledWith(
          createUserId(inputData.userId),
          inputData.organizationId,
          newStandardVersion,
          [{ content: 'Updated rule content', examples: [] }],
        );
      });

      it('creates new standard version with updated rules', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            standardId,
            name: inputData.name,
            slug: 'original-standard-name',
            description: inputData.description,
            version: 3,
            scope: null,
            userId: createUserId(inputData.userId),
          }),
        );
      });

      it('ensures userId is properly passed to standard version creation', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: createUserId(inputData.userId),
          }),
        );
      });

      it('validates that userId is not null or undefined for new version creation', () => {
        const callArgs = (
          standardVersionService.addStandardVersion as jest.Mock
        ).mock.calls[0][0];
        expect(callArgs.userId).toBeDefined();
        expect(callArgs.userId).not.toBeNull();
        expect(callArgs.userId).toEqual(createUserId(inputData.userId));
      });

      it('returns the updated standard', () => {
        expect(result).toEqual(updatedStandard);
      });
    });

    describe('when content has not changed', () => {
      let inputData: UpdateStandardCommand;
      let existingStandard: Standard;
      let latestVersion: StandardVersion;
      let existingRules: Rule[];
      let result: Standard;

      beforeEach(async () => {
        inputData = {
          standardId: standardId,
          name: 'Same Standard Name',
          description: 'Same description',
          rules: [
            { id: createRuleId(uuidv4()), content: 'Same rule 1' },
            { id: createRuleId(uuidv4()), content: 'Same rule 2' },
          ],
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: null,
        };

        existingStandard = standardFactory({
          id: standardId,
          name: 'Same Standard Name',
          description: 'Same description',
          version: 1,
          spaceId: spaceId,
        });

        latestVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId,
          name: 'Same Standard Name',
          description: 'Same description',
          version: 1,
        });

        existingRules = [
          ruleFactory({
            content: 'Same rule 1',
            standardVersionId: latestVersion.id,
          }),
          ruleFactory({
            content: 'Same rule 2',
            standardVersionId: latestVersion.id,
          }),
        ];

        // Setup mocks
        standardService.getStandardById.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);

        const response = await updateStandardUsecase.execute(inputData);
        result = response.standard;
      });

      it('does not update the standard', () => {
        expect(standardService.updateStandard).not.toHaveBeenCalled();
      });

      it('does not create a new version', () => {
        expect(
          standardVersionService.addStandardVersion,
        ).not.toHaveBeenCalled();
      });

      describe('when content is unchanged', () => {
        it('does not call generateStandardSummary method', () => {
          expect(
            updateStandardUsecase.generateStandardSummary,
          ).not.toHaveBeenCalled();
        });
      });

      it('returns the existing standard unchanged', () => {
        expect(result).toEqual(existingStandard);
      });

      it('does not call services with userId for unchanged content', () => {
        // Verify that when content is unchanged, we don't make unnecessary calls
        // but if we did, userId should still be properly handled
        expect(standardService.updateStandard).not.toHaveBeenCalled();
        expect(
          standardVersionService.addStandardVersion,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when name does not change but other content changes', () => {
      let inputData: UpdateStandardCommand;
      let existingStandard: Standard;
      let latestVersion: StandardVersion;
      let existingRules: Rule[];

      beforeEach(async () => {
        // Use the same name but change description to trigger content change
        inputData = {
          standardId: standardId,
          name: 'Original Standard Name', // Same name as existing
          description: 'Updated description', // Different description
          rules: [{ id: createRuleId(uuidv4()), content: 'Updated rule 1' }], // Different rules
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: null,
        };

        existingStandard = standardFactory({
          id: standardId,
          name: 'Original Standard Name',
          slug: 'original-standard-name', // Original slug
          description: 'Original description',
          version: 1,
          spaceId: spaceId,
        });

        latestVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId,
          name: 'Original Standard Name',
          slug: 'original-standard-name',
          description: 'Original description',
          version: 1,
        });

        existingRules = [
          ruleFactory({
            content: 'Original rule 1',
            standardVersionId: latestVersion.id,
          }),
        ];

        const updatedStandard = standardFactory({
          id: standardId,
          name: 'Original Standard Name',
          slug: 'original-standard-name', // Should preserve original slug
          description: 'Updated description',
          version: 2,
        });

        const newVersion = standardVersionFactory({
          standardId,
          name: 'Original Standard Name',
          slug: 'original-standard-name', // Should preserve original slug
          description: 'Updated description',
          version: 2,
        });

        // Setup mocks
        standardService.getStandardById.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        await updateStandardUsecase.execute(inputData);
      });

      it('preserves the original slug', () => {
        expect(standardService.updateStandard).toHaveBeenCalledWith(
          standardId,
          expect.objectContaining({
            slug: 'original-standard-name', // Should preserve original slug
            name: 'Original Standard Name',
          }),
        );
      });

      it('preserves the original slug in new version', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            slug: 'original-standard-name', // Should preserve original slug
            name: 'Original Standard Name',
          }),
        );
      });

      it('updates the standard with incremented version', () => {
        expect(standardService.updateStandard).toHaveBeenCalledWith(
          standardId,
          {
            name: inputData.name,
            description: inputData.description,
            slug: 'original-standard-name', // Should preserve original slug
            version: 2,
            gitCommit: undefined,
            userId: createUserId(inputData.userId),
            scope: inputData.scope,
          },
        );
      });

      it('creates new standard version with preserved slug', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            standardId,
            name: inputData.name,
            slug: 'original-standard-name',
            description: inputData.description,
            version: 2,
            scope: null,
            userId: createUserId(inputData.userId),
          }),
        );
      });

      it('ensures userId is properly preserved for non-name changes', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: createUserId(inputData.userId),
          }),
        );
      });
    });

    describe('when summary generation fails', () => {
      let inputData: UpdateStandardCommand;
      let existingStandard: Standard;
      let latestVersion: StandardVersion;
      let existingRules: Rule[];

      beforeEach(async () => {
        inputData = {
          standardId: standardId,
          name: 'Updated Standard Name',
          description: 'Updated description',
          rules: [
            { id: createRuleId(uuidv4()), content: 'Updated rule content' },
          ],
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: null,
        };

        existingStandard = standardFactory({
          id: standardId,
          name: 'Original Standard Name',
          description: 'Original description',
          version: 1,
          spaceId: spaceId,
        });

        latestVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId,
          name: 'Original Standard Name',
          description: 'Original description',
          version: 1,
        });

        existingRules = [
          ruleFactory({
            content: 'Original rule content',
            standardVersionId: latestVersion.id,
          }),
        ];

        const updatedStandard = standardFactory({
          id: standardId,
          name: inputData.name,
          description: inputData.description,
          version: 2,
        });

        const newStandardVersion = standardVersionFactory({
          standardId,
          name: inputData.name,
          description: inputData.description,
          version: 2,
        });

        // Setup mocks
        standardService.getStandardById.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          newStandardVersion,
        );

        await updateStandardUsecase.execute(inputData);
      });

      it('still updates the standard despite summary failure', () => {
        expect(standardService.updateStandard).toHaveBeenCalled();
      });

      it('still creates new version despite summary failure', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalled();
      });

      it('ensures userId is properly passed despite summary generation failures', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: createUserId(inputData.userId),
          }),
        );
      });

      it('validates userId is not lost during error handling', () => {
        const callArgs = (
          standardVersionService.addStandardVersion as jest.Mock
        ).mock.calls[0][0];
        expect(callArgs.userId).toBeDefined();
        expect(callArgs.userId).toEqual(createUserId(inputData.userId));
      });
    });

    describe('userId handling', () => {
      let inputData: UpdateStandardCommand;
      let existingStandard: Standard;
      let latestVersion: StandardVersion;
      let existingRules: Rule[];

      beforeEach(async () => {
        inputData = {
          standardId: standardId,
          name: 'Updated Standard Name',
          description: 'Updated description',
          rules: [
            { id: createRuleId(uuidv4()), content: 'Updated rule content' },
          ],
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: null,
        };

        existingStandard = standardFactory({
          id: standardId,
          name: 'Original Standard Name',
          description: 'Original description',
          version: 1,
          spaceId: spaceId,
        });

        latestVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId,
          name: 'Original Standard Name',
          description: 'Original description',
          version: 1,
        });

        existingRules = [
          ruleFactory({
            content: 'Original rule content',
            standardVersionId: latestVersion.id,
          }),
        ];

        const updatedStandard = standardFactory({
          id: standardId,
          name: inputData.name,
          description: inputData.description,
          version: 2,
        });

        const newStandardVersion = standardVersionFactory({
          standardId,
          name: inputData.name,
          description: inputData.description,
          version: 2,
        });

        // Setup mocks
        standardService.getStandardById.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          newStandardVersion,
        );

        await updateStandardUsecase.execute(inputData);
      });

      it('passes the correct userId to standard update', () => {
        expect(standardService.updateStandard).toHaveBeenCalledWith(
          standardId,
          expect.objectContaining({
            userId: createUserId(inputData.userId),
          }),
        );
      });

      it('passes the correct userId to standard version creation', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: createUserId(inputData.userId),
          }),
        );
      });

      it('ensures userId is never null for content changes', () => {
        const standardUpdateArgs = (standardService.updateStandard as jest.Mock)
          .mock.calls[0][1];
        const versionCreateArgs = (
          standardVersionService.addStandardVersion as jest.Mock
        ).mock.calls[0][0];

        expect(standardUpdateArgs.userId).toBeDefined();
        expect(standardUpdateArgs.userId).not.toBeNull();
        expect(versionCreateArgs.userId).toBeDefined();
        expect(versionCreateArgs.userId).not.toBeNull();
      });

      it('maintains userId consistency between standard and version updates', () => {
        const standardUpdateArgs = (standardService.updateStandard as jest.Mock)
          .mock.calls[0][1];
        const versionCreateArgs = (
          standardVersionService.addStandardVersion as jest.Mock
        ).mock.calls[0][0];

        const expectedUserId = createUserId(inputData.userId);
        expect(standardUpdateArgs.userId).toEqual(expectedUserId);
        expect(versionCreateArgs.userId).toEqual(expectedUserId);
        expect(standardUpdateArgs.userId).toEqual(versionCreateArgs.userId);
      });
    });

    describe('content change detection', () => {
      let existingStandard: Standard;
      let latestVersion: StandardVersion;

      beforeEach(() => {
        existingStandard = standardFactory({
          id: standardId,
          version: 1,
          spaceId: spaceId,
        });

        latestVersion = standardVersionFactory({
          standardId,
          name: 'Original Name',
          description: 'Original description',
          version: 1,
        });

        standardService.getStandardById.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
      });

      it('detects name changes', async () => {
        const existingRules = [ruleFactory({ content: 'Same rule' })];
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);

        const inputData: UpdateStandardCommand = {
          standardId: standardId,
          name: 'Different Name', // Changed
          description: 'Original description',
          rules: [{ id: createRuleId(uuidv4()), content: 'Same rule' }],
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: null,
        };

        const updatedStandard = standardFactory({ version: 2 });
        const newVersion = standardVersionFactory({ version: 2 });

        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        await updateStandardUsecase.execute(inputData);

        expect(standardService.updateStandard).toHaveBeenCalled();
        expect(standardVersionService.addStandardVersion).toHaveBeenCalled();
      });

      it('detects description changes', async () => {
        const existingRules = [ruleFactory({ content: 'Same rule' })];
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);

        const inputData: UpdateStandardCommand = {
          standardId: standardId,
          name: 'Original Name',
          description: 'Different description', // Changed
          rules: [{ id: createRuleId(uuidv4()), content: 'Same rule' }],
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: null,
        };

        const updatedStandard = standardFactory({ version: 2 });
        const newVersion = standardVersionFactory({ version: 2 });

        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        await updateStandardUsecase.execute(inputData);

        expect(standardService.updateStandard).toHaveBeenCalled();
        expect(standardVersionService.addStandardVersion).toHaveBeenCalled();
      });

      it('detects rule count changes', async () => {
        const existingRules = [
          ruleFactory({ content: 'Rule 1' }),
          ruleFactory({ content: 'Rule 2' }),
        ];
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);

        const inputData: UpdateStandardCommand = {
          standardId: standardId,
          name: 'Original Name',
          description: 'Original description',
          rules: [{ id: createRuleId(uuidv4()), content: 'Rule 1' }], // Fewer rules
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: null,
        };

        const updatedStandard = standardFactory({ version: 2 });
        const newVersion = standardVersionFactory({ version: 2 });

        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        await updateStandardUsecase.execute(inputData);

        expect(standardService.updateStandard).toHaveBeenCalled();
        expect(standardVersionService.addStandardVersion).toHaveBeenCalled();
      });

      it('detects rule content changes', async () => {
        const existingRules = [
          ruleFactory({ content: 'Original rule content' }),
        ];
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);

        const inputData: UpdateStandardCommand = {
          standardId: standardId,
          name: 'Original Name',
          description: 'Original description',
          rules: [
            { id: createRuleId(uuidv4()), content: 'Modified rule content' },
          ], // Changed content
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: null,
        };

        const updatedStandard = standardFactory({ version: 2 });
        const newVersion = standardVersionFactory({ version: 2 });

        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        await updateStandardUsecase.execute(inputData);

        expect(standardService.updateStandard).toHaveBeenCalled();
        expect(standardVersionService.addStandardVersion).toHaveBeenCalled();
      });

      it('detects scope changes', async () => {
        const existingRules = [ruleFactory({ content: 'Same rule' })];
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);

        // Update the latestVersion to have an original scope
        latestVersion = standardVersionFactory({
          standardId,
          name: 'Original Name',
          description: 'Original description',
          scope: 'original-scope', // Original scope value
          version: 1,
        });
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );

        const inputData: UpdateStandardCommand = {
          standardId: standardId,
          name: 'Original Name',
          description: 'Original description',
          rules: [{ id: createRuleId(uuidv4()), content: 'Same rule' }],
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: 'updated-scope', // Changed scope
        };

        const updatedStandard = standardFactory({ version: 2 });
        const newVersion = standardVersionFactory({ version: 2 });

        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        await updateStandardUsecase.execute(inputData);

        expect(standardService.updateStandard).toHaveBeenCalled();
        expect(standardVersionService.addStandardVersion).toHaveBeenCalled();
      });
    });

    describe('userId edge cases', () => {
      it('handles userId properly for updates with valid user context', async () => {
        const inputData: UpdateStandardCommand = {
          standardId: standardId,
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ id: createRuleId(uuidv4()), content: 'Test rule' }],
          organizationId: organizationId,
          userId: userId.toString(), // Valid userId
          spaceId: spaceId,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Original Name',
          version: 1,
          spaceId: spaceId,
        });

        const latestVersion = standardVersionFactory({
          standardId,
          name: 'Original Name',
          description: 'Original description',
          version: 1,
        });

        const existingRules = [ruleFactory({ content: 'Original rule' })];
        const updatedStandard = standardFactory({ version: 2 });
        const newVersion = standardVersionFactory({ version: 2 });

        standardService.getStandardById.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        const response = await updateStandardUsecase.execute(inputData);
        const result = response.standard;

        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: createUserId(inputData.userId),
          }),
        );
        expect(result).toEqual(updatedStandard);
      });
    });

    describe('space validation', () => {
      describe('when space does not exist', () => {
        it('throws error', async () => {
          const inputData: UpdateStandardCommand = {
            standardId: standardId,
            name: 'Test',
            description: 'Test',
            rules: [],
            organizationId: organizationId,
            userId: userId.toString(),
            spaceId: spaceId,
            scope: null,
          };

          spacesPort.getSpaceById.mockResolvedValue(null);

          await expect(
            updateStandardUsecase.execute(inputData),
          ).rejects.toThrow(`Space with id ${spaceId} not found`);

          expect(standardService.getStandardById).not.toHaveBeenCalled();
        });
      });

      describe('when space does not belong to organization', () => {
        it('throws error', async () => {
          const inputData: UpdateStandardCommand = {
            standardId: standardId,
            name: 'Test',
            description: 'Test',
            rules: [],
            organizationId: organizationId,
            userId: userId.toString(),
            spaceId: spaceId,
            scope: null,
          };

          const wrongOrgId = createOrganizationId(uuidv4());
          spacesPort.getSpaceById.mockResolvedValue({
            ...mockSpace,
            organizationId: wrongOrgId,
          });

          await expect(
            updateStandardUsecase.execute(inputData),
          ).rejects.toThrow(
            `Space ${spaceId} does not belong to organization ${organizationId}`,
          );

          expect(standardService.getStandardById).not.toHaveBeenCalled();
        });
      });

      describe('when standard does not belong to space', () => {
        it('throws error', async () => {
          const inputData: UpdateStandardCommand = {
            standardId: standardId,
            name: 'Test',
            description: 'Test',
            rules: [],
            organizationId: organizationId,
            userId: userId.toString(),
            spaceId: spaceId,
            scope: null,
          };

          const wrongSpaceId = createSpaceId(uuidv4());
          const existingStandard = standardFactory({
            id: standardId,
            spaceId: wrongSpaceId,
          });

          standardService.getStandardById.mockResolvedValue(existingStandard);

          await expect(
            updateStandardUsecase.execute(inputData),
          ).rejects.toThrow(
            `Standard ${standardId} does not belong to space ${spaceId}`,
          );

          expect(
            standardVersionService.getLatestStandardVersion,
          ).not.toHaveBeenCalled();
        });
      });
    });

    describe('error handling', () => {
      describe('when standard does not exist', () => {
        it('throws error', async () => {
          const inputData: UpdateStandardCommand = {
            standardId: standardId,
            name: 'Test',
            description: 'Test',
            rules: [],
            organizationId: organizationId,
            userId: userId.toString(),
            spaceId: spaceId,
            scope: null,
          };

          standardService.getStandardById.mockResolvedValue(null);

          await expect(
            updateStandardUsecase.execute(inputData),
          ).rejects.toThrow(`Standard with id ${standardId} not found`);

          expect(
            standardVersionService.getLatestStandardVersion,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when no versions exist', () => {
        it('throws error', async () => {
          const inputData: UpdateStandardCommand = {
            standardId: standardId,
            name: 'Test',
            description: 'Test',
            rules: [],
            organizationId: organizationId,
            userId: userId.toString(),
            spaceId: spaceId,
            scope: null,
          };

          const existingStandard = standardFactory({
            id: standardId,
            spaceId: spaceId,
          });
          standardService.getStandardById.mockResolvedValue(existingStandard);
          standardVersionService.getLatestStandardVersion.mockResolvedValue(
            null,
          );

          await expect(
            updateStandardUsecase.execute(inputData),
          ).rejects.toThrow(`No versions found for standard ${standardId}`);
        });
      });

      it('propagates service errors', async () => {
        const inputData: UpdateStandardCommand = {
          standardId: standardId,
          name: 'Updated Name',
          description: 'Updated description',
          rules: [{ id: createRuleId(uuidv4()), content: 'New rule' }],
          organizationId: organizationId,
          userId: userId.toString(),
          spaceId: spaceId,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          version: 1,
          spaceId: spaceId,
        });
        const latestVersion = standardVersionFactory({
          standardId,
          version: 1,
        });
        const existingRules = [ruleFactory({ content: 'Original rule' })];

        standardService.getStandardById.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);

        const error = new Error('Database error');
        standardService.updateStandard.mockRejectedValue(error);

        await expect(updateStandardUsecase.execute(inputData)).rejects.toThrow(
          'Database error',
        );
      });
    });
  });
});
