import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';
import { Standard } from '../Standard';
import { StandardCreationMethod } from '../events/StandardCreatedEvent';

export type CreateStandardCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
  name: string;
  description: string;
  rules: Array<{ content: string }>;
  scope: string | null;
  method?: StandardCreationMethod;
};

export type CreateStandardResponse = {
  standard: Standard;
};

export type ICreateStandardUseCase = IUseCase<
  CreateStandardCommand,
  CreateStandardResponse
>;
