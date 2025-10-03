import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetWithRepository } from '../TargetWithRepository';

export type GetTargetsByRepositoryCommand = PackmindCommand & {
  owner: string;
  repo: string;
};

export type IGetTargetsByRepositoryUseCase = IUseCase<
  GetTargetsByRepositoryCommand,
  TargetWithRepository[]
>;
