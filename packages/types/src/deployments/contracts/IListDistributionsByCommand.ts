import { Distribution } from '../Distribution';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { CommandId } from '../../commands/CommandId';

export type ListDistributionsByCommandCommand = PackmindCommand & {
  recipeId: CommandId;
};

export type IListDistributionsByCommand = IUseCase<
  ListDistributionsByCommandCommand,
  Distribution[]
>;
