import { v4 as uuidv4 } from 'uuid';
import { CreateRenderModeConfigurationUseCase } from './CreateRenderModeConfigurationUseCase';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { stubLogger } from '@packmind/test-utils';
import {
  CreateRenderModeConfigurationCommand,
  RenderMode,
} from '@packmind/types';
import {
  Organization,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createUserId,
} from '@packmind/accounts';
import { renderModeConfigurationFactory } from '../../../test';

const createMembership = (
  userId: string,
  organization: Organization,
  role: UserOrganizationMembership['role'],
): UserOrganizationMembership => ({
  userId: createUserId(userId),
  organizationId: organization.id,
  role,
});

const createUser = (
  userId: string,
  membership: UserOrganizationMembership,
): User => ({
  id: createUserId(userId),
  email: `${userId}@packmind.test`,
  passwordHash: null,
  active: true,
  memberships: [membership],
});

describe('CreateRenderModeConfigurationUseCase', () => {
  let service: jest.Mocked<RenderModeConfigurationService>;
  let userProvider: { getUserById: jest.Mock };
  let organizationProvider: { getOrganizationById: jest.Mock };
  let useCase: CreateRenderModeConfigurationUseCase;
  let command: CreateRenderModeConfigurationCommand;
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

    useCase = new CreateRenderModeConfigurationUseCase(
      service,
      userProvider,
      organizationProvider,
      stubLogger(),
    );
  });

  describe('when caller is an admin', () => {
    beforeEach(() => {
      const membership = createMembership(
        command.userId,
        organization,
        'admin',
      );
      const user = createUser(command.userId, membership);
      userProvider.getUserById.mockResolvedValue(user);

      service.createConfiguration.mockResolvedValue(
        renderModeConfigurationFactory({
          organizationId: organization.id,
          activeRenderModes: [RenderMode.PACKMIND, RenderMode.CLAUDE],
        }),
      );
    });

    it('creates configuration using provided render modes', async () => {
      await useCase.execute(command);

      expect(service.createConfiguration).toHaveBeenCalledWith(
        organization.id,
        [RenderMode.CLAUDE],
      );
    });

    describe('without provided modes', () => {
      it('falls back to defaults', async () => {
        await useCase.execute({ ...command, activeRenderModes: undefined });

        expect(service.createConfiguration).toHaveBeenCalledWith(
          organization.id,
          undefined,
        );
      });
    });
  });

  describe('when caller is a member', () => {
    beforeEach(() => {
      const membership = createMembership(
        command.userId,
        organization,
        'member',
      );
      const user = createUser(command.userId, membership);
      userProvider.getUserById.mockResolvedValue(user);

      service.createConfiguration.mockResolvedValue(
        renderModeConfigurationFactory({ organizationId: organization.id }),
      );
    });

    it('ignores provided render modes and uses defaults', async () => {
      await useCase.execute(command);

      expect(service.createConfiguration).toHaveBeenCalledWith(
        organization.id,
        undefined,
      );
    });
  });
});
