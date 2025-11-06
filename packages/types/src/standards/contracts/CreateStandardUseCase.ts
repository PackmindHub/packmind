import { IUseCase, PackmindCommand } from '../../UseCase';
import { Standard } from '../Standard';

export type CreateStandardCommand = PackmindCommand & {
  name: string;
  description: string;
  rules: Array<{ content: string }>;
  scope: string | null;
  spaceId: string; // Required space ID for space-specific standards
};

export type CreateStandardResponse = Standard;

export type ICreateStandardUseCase = IUseCase<
  CreateStandardCommand,
  CreateStandardResponse
>;
