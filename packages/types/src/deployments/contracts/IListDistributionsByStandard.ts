import { StandardDistributionHistoryEntry } from '../DistributionHistoryEntry';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { StandardId } from '../../standards/StandardId';

export type ListDistributionsByStandardCommand = PackmindCommand & {
  standardId: StandardId;
};

export type ListDistributionsByStandardResponse =
  StandardDistributionHistoryEntry[];

export type IListDistributionsByStandard = IUseCase<
  ListDistributionsByStandardCommand,
  ListDistributionsByStandardResponse
>;
