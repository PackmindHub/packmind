import { ProcessStandardChangesUsecase } from './processStandardChanges.usecase';
import { StandardService } from '../../services/StandardService';
import { AddRuleToStandardUsecase } from '../addRuleToStandard/addRuleToStandard.usecase';
import {
  ProcessStandardChangesCommand,
  ProcessStandardChangesResult,
} from '../../../domain/useCases/IProcessStandardChanges';
import { IAccountsPort, ISpacesPort } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  createSpaceId,
  createStandardId,
  OrganizationId,
  UserId,
  Space,
  Standard,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { userFactory, organizationFactory } from '@packmind/accounts/test';

describe('ProcessStandardChangesUsecase', () => {
  let usecase: ProcessStandardChangesUsecase;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let standardService: jest.Mocked<StandardService>;
  let addRuleToStandardUsecase: jest.Mocked<AddRuleToStandardUsecase>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let logger: jest.Mocked<PackmindLogger>;

  let organizationId: OrganizationId;
  let userId: UserId;
  let globalSpace: Space;

  beforeEach(() => {
    organizationId = createOrganizationId(uuidv4());
    userId = createUserId(uuidv4());

    globalSpace = spaceFactory({
      id: createSpaceId(uuidv4()),
      name: 'Global',
      slug: 'global',
      organizationId,
    });

    // Mock AccountsPort
    accountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    // Mock StandardService
    standardService = {
      findStandardBySlug: jest.fn(),
      getStandardById: jest.fn(),
      listStandardsBySpace: jest.fn(),
    } as unknown as jest.Mocked<StandardService>;

    // Mock AddRuleToStandardUsecase
    addRuleToStandardUsecase = {
      addRuleToStandard: jest.fn(),
    } as unknown as jest.Mocked<AddRuleToStandardUsecase>;

    // Mock SpacesPort
    spacesPort = {
      listSpacesByOrganization: jest.fn(),
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    logger = stubLogger();

    usecase = new ProcessStandardChangesUsecase(
      accountsAdapter,
      standardService,
      addRuleToStandardUsecase,
      spacesPort,
      logger,
    );

    // Setup default mocks for authorization
    const user = userFactory({
      id: userId,
      memberships: [{ organizationId, role: 'admin', userId }],
    });
    const organization = organizationFactory({ id: organizationId });
    accountsAdapter.getUserById.mockResolvedValue(user);
    accountsAdapter.getOrganizationById.mockResolvedValue(organization);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when processing ADDED operations successfully', () => {
      it('should add rule to existing standard', async () => {
        const standard = standardFactory({
          id: createStandardId(uuidv4()),
          slug: 'typescript-code-standards',
          name: 'TypeScript Code Standards',
        });

        const newVersion = standardVersionFactory({
          standardId: standard.id,
          version: 2,
        });

        const command: ProcessStandardChangesCommand = {
          userId,
          organizationId,
          changes: [
            {
              operation: 'ADDED',
              standard: 'typescript-code-standards',
              newRule: 'Use arrow functions instead of traditional functions',
            },
          ],
        };

        spacesPort.listSpacesByOrganization.mockResolvedValue([globalSpace]);
        standardService.findStandardBySlug.mockResolvedValue(standard);
        addRuleToStandardUsecase.addRuleToStandard.mockResolvedValue(
          newVersion,
        );

        const result = await usecase.execute(command);

        expect(result.succeeded).toHaveLength(1);
        expect(result.failed).toHaveLength(0);
        expect(result.succeeded[0]).toMatchObject({
          standardSlug: 'typescript-code-standards',
          rule: 'Use arrow functions instead of traditional functions',
          standardVersion: newVersion,
        });

        expect(spacesPort.listSpacesByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
        expect(standardService.findStandardBySlug).toHaveBeenCalledWith(
          'typescript-code-standards',
          organizationId,
        );
        expect(addRuleToStandardUsecase.addRuleToStandard).toHaveBeenCalledWith(
          {
            standardSlug: 'typescript-code-standards',
            ruleContent: 'Use arrow functions instead of traditional functions',
            organizationId,
            userId,
          },
        );
      });

      it('should process multiple changes in batch', async () => {
        const standard1 = standardFactory({
          slug: 'typescript-code-standards',
        });
        const standard2 = standardFactory({
          slug: 'tests-redaction',
        });

        const version1 = standardVersionFactory({ standardId: standard1.id });
        const version2 = standardVersionFactory({ standardId: standard2.id });

        const command: ProcessStandardChangesCommand = {
          userId,
          organizationId,
          changes: [
            {
              operation: 'ADDED',
              standard: 'typescript-code-standards',
              newRule: 'Rule 1',
            },
            {
              operation: 'ADDED',
              standard: 'tests-redaction',
              newRule: 'Rule 2',
            },
          ],
        };

        spacesPort.listSpacesByOrganization.mockResolvedValue([globalSpace]);
        standardService.findStandardBySlug
          .mockResolvedValueOnce(standard1)
          .mockResolvedValueOnce(standard2);
        addRuleToStandardUsecase.addRuleToStandard
          .mockResolvedValueOnce(version1)
          .mockResolvedValueOnce(version2);

        const result = await usecase.execute(command);

        expect(result.succeeded).toHaveLength(2);
        expect(result.failed).toHaveLength(0);
        expect(addRuleToStandardUsecase.addRuleToStandard).toHaveBeenCalledTimes(
          2,
        );
      });
    });

    describe('when standard not found', () => {
      it('should log error and continue processing', async () => {
        const command: ProcessStandardChangesCommand = {
          userId,
          organizationId,
          changes: [
            {
              operation: 'ADDED',
              standard: 'non-existent-standard',
              newRule: 'Some rule',
            },
          ],
        };

        spacesPort.listSpacesByOrganization.mockResolvedValue([globalSpace]);
        standardService.findStandardBySlug.mockResolvedValue(null);

        const result = await usecase.execute(command);

        expect(result.succeeded).toHaveLength(0);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0]).toMatchObject({
          standardSlug: 'non-existent-standard',
          rule: 'Some rule',
          error: "Standard 'non-existent-standard' not found",
        });
        expect(addRuleToStandardUsecase.addRuleToStandard).not.toHaveBeenCalled();
      });
    });

    describe('when non-ADDED operations are provided', () => {
      it('should skip UPDATED operations', async () => {
        const command: ProcessStandardChangesCommand = {
          userId,
          organizationId,
          changes: [
            {
              operation: 'UPDATED',
              standard: 'typescript-code-standards',
              oldRule: 'Old rule',
              newRule: 'New rule',
            },
          ],
        };

        spacesPort.listSpacesByOrganization.mockResolvedValue([globalSpace]);

        const result = await usecase.execute(command);

        expect(result.succeeded).toHaveLength(0);
        expect(result.failed).toHaveLength(0);
        expect(standardService.findStandardBySlug).not.toHaveBeenCalled();
        expect(addRuleToStandardUsecase.addRuleToStandard).not.toHaveBeenCalled();
      });

      it('should skip DELETED operations', async () => {
        const command: ProcessStandardChangesCommand = {
          userId,
          organizationId,
          changes: [
            {
              operation: 'DELETED',
              standard: 'typescript-code-standards',
              newRule: 'Some rule',
            },
          ],
        };

        spacesPort.listSpacesByOrganization.mockResolvedValue([globalSpace]);

        const result = await usecase.execute(command);

        expect(result.succeeded).toHaveLength(0);
        expect(result.failed).toHaveLength(0);
      });
    });

    describe('when space resolution fails', () => {
      it('should fail all changes if no spaces found', async () => {
        const command: ProcessStandardChangesCommand = {
          userId,
          organizationId,
          changes: [
            {
              operation: 'ADDED',
              standard: 'typescript-code-standards',
              newRule: 'Some rule',
            },
          ],
        };

        spacesPort.listSpacesByOrganization.mockResolvedValue([]);

        const result = await usecase.execute(command);

        expect(result.succeeded).toHaveLength(0);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].error).toContain(
          'Failed to resolve Global space',
        );
      });

      it('should fail all changes if SpacesPort not available', async () => {
        const usecaseWithoutSpaces = new ProcessStandardChangesUsecase(
          accountsAdapter,
          standardService,
          addRuleToStandardUsecase,
          null, // No SpacesPort
          logger,
        );

        const command: ProcessStandardChangesCommand = {
          userId,
          organizationId,
          changes: [
            {
              operation: 'ADDED',
              standard: 'typescript-code-standards',
              newRule: 'Some rule',
            },
          ],
        };

        const result = await usecaseWithoutSpaces.execute(command);

        expect(result.succeeded).toHaveLength(0);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].error).toContain(
          'Failed to resolve Global space',
        );
      });
    });

    describe('when batch processing with mixed success/failure', () => {
      it('should continue processing after failures', async () => {
        const standard2 = standardFactory({
          slug: 'tests-redaction',
        });
        const version2 = standardVersionFactory({ standardId: standard2.id });

        const command: ProcessStandardChangesCommand = {
          userId,
          organizationId,
          changes: [
            {
              operation: 'ADDED',
              standard: 'non-existent',
              newRule: 'Rule 1',
            },
            {
              operation: 'ADDED',
              standard: 'tests-redaction',
              newRule: 'Rule 2',
            },
          ],
        };

        spacesPort.listSpacesByOrganization.mockResolvedValue([globalSpace]);
        standardService.findStandardBySlug
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(standard2);
        addRuleToStandardUsecase.addRuleToStandard.mockResolvedValue(version2);

        const result = await usecase.execute(command);

        expect(result.succeeded).toHaveLength(1);
        expect(result.failed).toHaveLength(1);
        expect(result.succeeded[0].standardSlug).toBe('tests-redaction');
        expect(result.failed[0].standardSlug).toBe('non-existent');
      });

      it('should handle addRuleToStandard failures gracefully', async () => {
        const standard = standardFactory({
          slug: 'typescript-code-standards',
        });

        const command: ProcessStandardChangesCommand = {
          userId,
          organizationId,
          changes: [
            {
              operation: 'ADDED',
              standard: 'typescript-code-standards',
              newRule: 'Rule that will fail',
            },
          ],
        };

        spacesPort.listSpacesByOrganization.mockResolvedValue([globalSpace]);
        standardService.findStandardBySlug.mockResolvedValue(standard);
        addRuleToStandardUsecase.addRuleToStandard.mockRejectedValue(
          new Error('Database error'),
        );

        const result = await usecase.execute(command);

        expect(result.succeeded).toHaveLength(0);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].error).toBe('Database error');
      });
    });
  });
});
