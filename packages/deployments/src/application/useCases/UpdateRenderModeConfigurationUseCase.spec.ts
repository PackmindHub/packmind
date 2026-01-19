import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  IAccountsPort,
  Organization,
  RenderMode,
  RenderModeConfiguration,
  UpdateRenderModeConfigurationCommand,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { renderModeConfigurationFactory } from '../../../test';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { UpdateRenderModeConfigurationUseCase } from './UpdateRenderModeConfigurationUseCase';

const createUserWithMembership = (
  userId: string,
  organization: Organization,
  role: UserOrganizationMembership['role'],
): User => ({
  id: createUserId(userId),
  email: `${userId}@packmind.test`,
  passwordHash: null,
  active: true,
  memberships: [
    {
      userId: createUserId(userId),
      organizationId: organization.id,
      role,
    },
  ],
});

describe('UpdateRenderModeConfigurationUseCase', () => {
  let service: jest.Mocked<RenderModeConfigurationService>;
  let accountsPort: {
    getUserById: jest.Mock;
    getOrganizationById: jest.Mock;
  };
  let useCase: UpdateRenderModeConfigurationUseCase;
  let command: UpdateRenderModeConfigurationCommand;
  let organization: Organization;

  beforeEach(() => {
    service = {
      getConfiguration: jest.fn(),
      createConfiguration: jest.fn(),
      updateConfiguration: jest.fn(),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    };

    organization = {
      id: createOrganizationId(uuidv4()),
      name: 'Packmind',
      slug: 'packmind',
    };

    command = {
      organizationId: organization.id as unknown as string,
      userId: uuidv4(),
      activeRenderModes: [RenderMode.CLAUDE],
    };

    accountsPort.getOrganizationById.mockResolvedValue(organization);

    useCase = new UpdateRenderModeConfigurationUseCase(
      service,
      accountsPort as unknown as IAccountsPort,
      stubLogger(),
    );
  });

  describe('when user is admin', () => {
    beforeEach(() => {
      accountsPort.getUserById.mockResolvedValue(
        createUserWithMembership(command.userId, organization, 'admin'),
      );
    });

    describe('when updating existing configuration', () => {
      let existingConfiguration: RenderModeConfiguration;
      let updatedConfiguration: RenderModeConfiguration;
      let result: RenderModeConfiguration;

      beforeEach(async () => {
        existingConfiguration = renderModeConfigurationFactory({
          organizationId: organization.id,
          activeRenderModes: [RenderMode.PACKMIND],
        });

        updatedConfiguration = renderModeConfigurationFactory({
          organizationId: organization.id,
          activeRenderModes: [RenderMode.PACKMIND, RenderMode.CLAUDE],
        });

        service.getConfiguration.mockResolvedValue(existingConfiguration);
        service.updateConfiguration.mockResolvedValue(updatedConfiguration);

        result = await useCase.execute(command);
      });

      it('fetches current configuration', () => {
        expect(service.getConfiguration).toHaveBeenCalledWith(organization.id);
      });

      it('delegates update to service', () => {
        expect(service.updateConfiguration).toHaveBeenCalledWith(
          organization.id,
          command.activeRenderModes,
        );
      });

      it('returns the updated configuration', () => {
        expect(result).toEqual(updatedConfiguration);
      });
    });

    describe('with an invalid render mode', () => {
      let executePromise: Promise<RenderModeConfiguration>;

      beforeEach(() => {
        executePromise = useCase.execute({
          ...command,
          activeRenderModes: ['INVALID' as RenderMode],
        });
      });

      it('throws validation error', async () => {
        await expect(executePromise).rejects.toThrow(
          'Invalid render mode provided: INVALID',
        );
      });

      it('does not delegate to service', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(service.updateConfiguration).not.toHaveBeenCalled();
      });
    });

    describe('when configuration does not exist', () => {
      let configuration: RenderModeConfiguration;
      let result: RenderModeConfiguration;

      beforeEach(async () => {
        configuration = renderModeConfigurationFactory({
          organizationId: organization.id,
          activeRenderModes: [RenderMode.CLAUDE],
        });

        service.getConfiguration.mockResolvedValue(null);
        service.createConfiguration.mockResolvedValue(configuration);

        result = await useCase.execute(command);
      });

      it('fetches current configuration', () => {
        expect(service.getConfiguration).toHaveBeenCalledWith(organization.id);
      });

      it('creates new configuration', () => {
        expect(service.createConfiguration).toHaveBeenCalledWith(
          organization.id,
          command.activeRenderModes,
        );
      });

      it('returns the created configuration', () => {
        expect(result).toEqual(configuration);
      });
    });

    it('propagates service errors', async () => {
      const existingConfiguration: RenderModeConfiguration =
        renderModeConfigurationFactory({
          organizationId: organization.id,
          activeRenderModes: [RenderMode.PACKMIND],
        });

      service.getConfiguration.mockResolvedValue(existingConfiguration);
      service.updateConfiguration.mockRejectedValue(
        new Error('Update failure'),
      );

      await expect(useCase.execute(command)).rejects.toThrow('Update failure');
    });
  });

  describe('when user is not admin', () => {
    let executePromise: Promise<RenderModeConfiguration>;

    beforeEach(() => {
      accountsPort.getUserById.mockResolvedValue(
        createUserWithMembership(command.userId, organization, 'member'),
      );
      executePromise = useCase.execute(command);
    });

    it('throws an OrganizationAdminRequiredError', async () => {
      await expect(executePromise).rejects.toBeInstanceOf(
        OrganizationAdminRequiredError,
      );
    });

    it('does not delegate to service', async () => {
      await executePromise.catch(() => {
        /* expected rejection */
      });
      expect(service.updateConfiguration).not.toHaveBeenCalled();
    });
  });
});
