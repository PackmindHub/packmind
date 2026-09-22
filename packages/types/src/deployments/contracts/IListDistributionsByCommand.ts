import { CommandDistributionHistoryEntry } from '../DistributionHistoryEntry';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { CommandId } from '../../commands/CommandId';

export type ListDistributionsByCommandCommand = PackmindCommand & {
  recipeId: CommandId;
};

export type ListDistributionsByCommandResponse =
  CommandDistributionHistoryEntry[];

export type IListDistributionsByCommand = IUseCase<
  ListDistributionsByCommandCommand,
  ListDistributionsByCommandResponse
>;
