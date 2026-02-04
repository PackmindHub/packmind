import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';
import { Standard } from '../Standard';
import { StandardCreationMethod } from '../events/StandardCreatedEvent';

/**
 * Example input for rule creation via API.
 * Uses string `lang` which gets converted to ProgrammingLanguage by the service.
 */
export type CreateStandardRuleExampleInput = {
  lang: string;
  positive: string;
  negative: string;
};

/**
 * Rule input for standard creation via API.
 * Supports optional examples that will be created atomically with the standard.
 */
export type CreateStandardRuleInput = {
  content: string;
  examples?: CreateStandardRuleExampleInput[];
};

export type CreateStandardCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
  name: string;
  description: string;
  rules: CreateStandardRuleInput[];
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
