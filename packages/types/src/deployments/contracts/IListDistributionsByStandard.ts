import { Distribution } from '../Distribution';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { StandardId } from '../../standards/StandardId';

export type ListDistributionsByStandardCommand = PackmindCommand & {
  standardId: StandardId;
};

export type IListDistributionsByStandard = IUseCase<
  ListDistributionsByStandardCommand,
  Distribution[]
>;
