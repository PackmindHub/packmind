import { v4 as uuidv4 } from 'uuid';
import { GetRenderModeConfigurationUseCase } from './GetRenderModeConfigurationUseCase';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { stubLogger } from '@packmind/shared/test';
import {
  GetRenderModeConfigurationCommand,
  RenderMode,
  RenderModeConfiguration,
} from '@packmind/shared';
import {
  Organization,
  OrganizationId,
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

describe('GetRenderModeConfigurationUseCase', () => {
  let service: jest.Mocked<RenderModeConfigurationService>;
  let userProvider: {
    getUserById: jest.Mock;
  };
  let organizationProvider: {
    getOrganizationById: jest.Mock;
  };
  let useCase: GetRenderModeConfigurationUseCase;
  let command: GetRenderModeConfigurationCommand;
  let organizationId: OrganizationId;
  let organization: Organization;

  beforeEach(() => {
    service = {
      getConfiguration: jest.fn(),
      upsertConfiguration: jest.fn(),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    userProvider = {
      getUserById: jest.fn(),
    };
    organizationProvider = {
      getOrganizationById: jest.fn(),
    };

    organizationId = createOrganizationId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Packmind',
      slug: 'packmind',
    };

    command = {
      organizationId: organizationId as unknown as string,
      userId: uuidv4(),
    };

    organizationProvider.getOrganizationById.mockResolvedValue(organization);
    userProvider.getUserById.mockResolvedValue(
      createUserWithMembership(command.userId, organization, 'member'),
    );

    useCase = new GetRenderModeConfigurationUseCase(
      service,
      userProvider,
      organizationProvider,
      stubLogger(),
    );
  });

  describe('when service provides a configuration', () => {
    it('wraps the configuration in the result object', async () => {
      const configuration: RenderModeConfiguration =
        renderModeConfigurationFactory({
          organizationId,
          activeRenderModes: [RenderMode.PACKMIND, RenderMode.CLAUDE],
        });

      service.getConfiguration.mockResolvedValue(configuration);

      const result = await useCase.execute(command);

      expect(result).toEqual({ configuration });
      expect(service.getConfiguration).toHaveBeenCalledWith(organizationId);
    });
  });

  describe('when service returns null', () => {
    it('returns a null configuration result', async () => {
      service.getConfiguration.mockResolvedValue(null);

      const result = await useCase.execute(command);

      expect(result).toEqual({ configuration: null });
    });
  });
});
