import { IUseCase, PackmindCommand } from '../../UseCase';
import { Standard } from '../Standard';
import { RuleWithExamples } from '../RuleWithExamples';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardCreationMethod } from '../events/StandardCreatedEvent';

export type CreateStandardWithPackagesCommand = PackmindCommand & {
  spaceId: SpaceId;
  name: string;
  description: string;
  summary?: string;
  scope?: string | null;
  rules: RuleWithExamples[];
  packageSlugs?: string[];
  method?: StandardCreationMethod;
};

export type CreateStandardWithPackagesResponse = {
  standard: Standard;
};

export type ICreateStandardWithPackagesUseCase = IUseCase<
  CreateStandardWithPackagesCommand,
  CreateStandardWithPackagesResponse
>;
