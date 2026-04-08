import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  DeleteRuleExampleCommand,
  IAccountsPort,
  ISpacesPort,
  Organization,
  RuleExampleId,
  RuleUpdatedEvent,
  User,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  ruleExampleFactory,
  ruleFactory,
  standardVersionFactory,
} from '../../../../test';
import { RuleExampleNotFoundInSpaceError } from '../../../domain/errors/RuleExampleNotFoundInSpaceError';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { IStandardVersionRepository } from '../../../domain/repositories/IStandardVersionRepository';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import { DeleteRuleExampleUsecase } from './deleteRuleExample.usecase';

describe('DeleteRuleExampleUsecase', () => {
  let usecase: DeleteRuleExampleUsecase;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let repositories: jest.Mocked<IStandardsRepositories>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let standardVersionRepository: jest.Mocked<IStandardVersionRepository>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let logger: PackmindLogger;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());

  const user: User = {
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    memberships: [{ organizationId, role: 'member', userId }],
    active: true,
    trial: false,
  };
  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const createCommand = (props: {
    ruleExampleId: RuleExampleId;
  }): DeleteRuleExampleCommand => ({
    ...props,
    userId,
    organizationId,
    spaceId,
  });

  beforeEach(() => {
    spacesPort = {
      findMembership: jest.fn().mockResolvedValue({ userId, spaceId }),
    } as unknown as jest.Mocked<ISpacesPort>;

    accountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByIdInSpace: jest.fn(),
      updateById: jest.fn(),
      findByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      hardDeleteById: jest.fn(),
    };

    ruleRepository = {
      findById: jest.fn(),
      findByIdInSpace: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByStandardVersionId: jest.fn(),
    } as unknown as jest.Mocked<IRuleRepository>;

    standardVersionRepository = {
      findById: jest.fn(),
      list: jest.fn(),
      findByStandardId: jest.fn(),
      findLatestByStandardId: jest.fn(),
      findByStandardIdAndVersion: jest.fn(),
      updateSummary: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IStandardVersionRepository>;

    repositories = {
      getRuleExampleRepository: jest
        .fn()
        .mockReturnValue(ruleExampleRepository),
      getStandardVersionRepository: jest
        .fn()
        .mockReturnValue(standardVersionRepository),
      getRuleRepository: jest.fn().mockReturnValue(ruleRepository),
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
      getStandardRepository: jest.fn(),
    } as jest.Mocked<IStandardsRepositories>;

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    logger = stubLogger();

    accountsAdapter.getUserById.mockResolvedValue(user);
    accountsAdapter.getOrganizationById.mockResolvedValue(organization);

    usecase = new DeleteRuleExampleUsecase(
      spacesPort,
      accountsAdapter,
      repositories,
      eventEmitterService,
      undefined,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when deleting a rule example successfully', () => {
    let existingExample: ReturnType<typeof ruleExampleFactory>;

    beforeEach(async () => {
      const standardVersion = standardVersionFactory();
      const rule = ruleFactory({ standardVersionId: standardVersion.id });
      existingExample = ruleExampleFactory({ ruleId: rule.id });

      ruleExampleRepository.findByIdInSpace.mockResolvedValue(existingExample);
      ruleExampleRepository.deleteById.mockResolvedValue(undefined);
      ruleRepository.findById.mockResolvedValue(rule);
      standardVersionRepository.findById.mockResolvedValue(standardVersion);

      const command = createCommand({
        ruleExampleId: existingExample.id,
      });

      await usecase.execute(command);
    });

    it('finds the rule example by id in space', () => {
      expect(ruleExampleRepository.findByIdInSpace).toHaveBeenCalledWith(
        existingExample.id,
        spaceId,
      );
    });

    it('deletes the rule example by id', () => {
      expect(ruleExampleRepository.deleteById).toHaveBeenCalledWith(
        existingExample.id,
      );
    });

    it('emits RuleUpdatedEvent', () => {
      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.any(RuleUpdatedEvent),
      );
    });
  });

  describe('when rule example is not found in space', () => {
    it('throws RuleExampleNotFoundInSpaceError', async () => {
      ruleExampleRepository.findByIdInSpace.mockResolvedValue(null);

      const command = createCommand({
        ruleExampleId: 'non-existent-id' as RuleExampleId,
      });

      await expect(usecase.execute(command)).rejects.toThrow(
        RuleExampleNotFoundInSpaceError,
      );
    });
  });
});
