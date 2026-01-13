import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  DeleteRuleExampleCommand,
  IAccountsPort,
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
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { IStandardVersionRepository } from '../../../domain/repositories/IStandardVersionRepository';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import { DeleteRuleExampleUsecase } from './deleteRuleExample.usecase';

describe('DeleteRuleExampleUsecase', () => {
  let usecase: DeleteRuleExampleUsecase;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let repositories: jest.Mocked<IStandardsRepositories>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let standardVersionRepository: jest.Mocked<IStandardVersionRepository>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let logger: PackmindLogger;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());

  const user: User = {
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    memberships: [{ organizationId, role: 'member', userId }],
    active: true,
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
  });

  beforeEach(() => {
    accountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      findByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    };

    ruleRepository = {
      findById: jest.fn(),
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
      getStandardRepository: jest.fn(),
      getStandardVersionRepository: jest
        .fn()
        .mockReturnValue(standardVersionRepository),
      getRuleRepository: jest.fn().mockReturnValue(ruleRepository),
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
    } as jest.Mocked<IStandardsRepositories>;

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    logger = stubLogger();

    accountsAdapter.getUserById.mockResolvedValue(user);
    accountsAdapter.getOrganizationById.mockResolvedValue(organization);

    usecase = new DeleteRuleExampleUsecase(
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

  it('deletes a rule example successfully', async () => {
    const standardVersion = standardVersionFactory();
    const rule = ruleFactory({ standardVersionId: standardVersion.id });
    const existingExample = ruleExampleFactory({ ruleId: rule.id });

    ruleExampleRepository.findById.mockResolvedValue(existingExample);
    ruleExampleRepository.deleteById.mockResolvedValue(undefined);
    ruleRepository.findById.mockResolvedValue(rule);
    standardVersionRepository.findById.mockResolvedValue(standardVersion);

    const command = createCommand({
      ruleExampleId: existingExample.id,
    });

    await usecase.execute(command);

    expect(ruleExampleRepository.findById).toHaveBeenCalledWith(
      existingExample.id,
    );
    expect(ruleExampleRepository.deleteById).toHaveBeenCalledWith(
      existingExample.id,
    );
  });

  it('emits RuleUpdatedEvent after deleting', async () => {
    const standardVersion = standardVersionFactory();
    const rule = ruleFactory({ standardVersionId: standardVersion.id });
    const existingExample = ruleExampleFactory({ ruleId: rule.id });

    ruleExampleRepository.findById.mockResolvedValue(existingExample);
    ruleExampleRepository.deleteById.mockResolvedValue(undefined);
    ruleRepository.findById.mockResolvedValue(rule);
    standardVersionRepository.findById.mockResolvedValue(standardVersion);

    const command = createCommand({
      ruleExampleId: existingExample.id,
    });

    await usecase.execute(command);

    expect(eventEmitterService.emit).toHaveBeenCalledWith(
      expect.any(RuleUpdatedEvent),
    );
  });

  describe('when rule example does not exist', () => {
    it('throws an error', async () => {
      ruleExampleRepository.findById.mockResolvedValue(null);

      const command = createCommand({
        ruleExampleId: 'non-existent-id' as RuleExampleId,
      });

      await expect(usecase.execute(command)).rejects.toThrow(
        'Rule example with id non-existent-id not found',
      );
      expect(ruleExampleRepository.findById).toHaveBeenCalledWith(
        'non-existent-id',
      );
      expect(ruleExampleRepository.deleteById).not.toHaveBeenCalled();
    });
  });
});
