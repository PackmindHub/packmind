import { v4 as uuidv4 } from 'uuid';
import { UpdateRenderModeConfigurationUseCase } from './UpdateRenderModeConfigurationUseCase';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { stubLogger } from '@packmind/test-utils';
import {
  RenderMode,
  RenderModeConfiguration,
  UpdateRenderModeConfigurationCommand,
} from '@packmind/types';
import { OrganizationAdminRequiredError } from '@packmind/shared';
import {
  Organization,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createUserId,
} from '@packmind/accounts';
import { renderModeConfigurationFactory } from '../../../test';

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
  let userProvider: {
    getUserById: jest.Mock;
  };
  let organizationProvider: {
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

    userProvider = {
      getUserById: jest.fn(),
    };
    organizationProvider = {
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

    organizationProvider.getOrganizationById.mockResolvedValue(organization);

    useCase = new UpdateRenderModeConfigurationUseCase(
      service,
      userProvider,
      organizationProvider,
      stubLogger(),
    );
  });

  describe('when user is admin', () => {
    beforeEach(() => {
      userProvider.getUserById.mockResolvedValue(
        createUserWithMembership(command.userId, organization, 'admin'),
      );
    });

    it('delegates to service and returns updated configuration', async () => {
      const existingConfiguration: RenderModeConfiguration =
        renderModeConfigurationFactory({
          organizationId: organization.id,
          activeRenderModes: [RenderMode.PACKMIND],
        });

      const updatedConfiguration: RenderModeConfiguration =
        renderModeConfigurationFactory({
          organizationId: organization.id,
          activeRenderModes: [RenderMode.PACKMIND, RenderMode.CLAUDE],
        });

      service.getConfiguration.mockResolvedValue(existingConfiguration);
      service.updateConfiguration.mockResolvedValue(updatedConfiguration);

      const result = await useCase.execute(command);

      expect(service.getConfiguration).toHaveBeenCalledWith(organization.id);
      expect(service.updateConfiguration).toHaveBeenCalledWith(
        organization.id,
        command.activeRenderModes,
      );
      expect(result).toEqual(updatedConfiguration);
    });

    describe('with an invalid render mode', () => {
      it('throws validation error without delegating to service', async () => {
        await expect(
          useCase.execute({
            ...command,
            activeRenderModes: ['INVALID' as RenderMode],
          }),
        ).rejects.toThrow('Invalid render mode provided: INVALID');

        expect(service.updateConfiguration).not.toHaveBeenCalled();
      });
    });

    it('creates configuration if it does not exist', async () => {
      const configuration: RenderModeConfiguration =
        renderModeConfigurationFactory({
          organizationId: organization.id,
          activeRenderModes: [RenderMode.CLAUDE],
        });

      service.getConfiguration.mockResolvedValue(null);
      service.createConfiguration.mockResolvedValue(configuration);

      const result = await useCase.execute(command);

      expect(service.getConfiguration).toHaveBeenCalledWith(organization.id);
      expect(service.createConfiguration).toHaveBeenCalledWith(
        organization.id,
        command.activeRenderModes,
      );
      expect(result).toEqual(configuration);
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
    beforeEach(() => {
      userProvider.getUserById.mockResolvedValue(
        createUserWithMembership(command.userId, organization, 'member'),
      );
    });

    it('throws an OrganizationAdminRequiredError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        OrganizationAdminRequiredError,
      );
      expect(service.updateConfiguration).not.toHaveBeenCalled();
    });
  });
});
