import { IUseCase } from '@packmind/types';
import { Standard, StandardId } from '../Standard';
import { RuleId } from '../Rule';
import { OrganizationId } from '@packmind/types';
import { SpaceId } from '../../spaces/Space';

export type UpdateStandardCommand = {
  userId: string;
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
