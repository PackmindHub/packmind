import { IUseCase, PackmindCommand } from '../../UseCase';
import { Standard } from '../Standard';
import { StandardId } from '../StandardId';
import { RuleId } from '../RuleId';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';

export type UpdateStandardCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
  standardId: StandardId;
  name: string;
  description: string;
  rules: Array<{ id: RuleId; content: string }>;
  scope: string | null;
};

export type UpdateStandardResponse = {
  standard: Standard;
};

export type IUpdateStandardUseCase = IUseCase<
  UpdateStandardCommand,
  UpdateStandardResponse
>;
