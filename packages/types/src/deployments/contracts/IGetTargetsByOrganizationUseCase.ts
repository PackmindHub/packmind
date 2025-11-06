import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetWithRepository } from '../TargetWithRepository';

export type GetTargetsByOrganizationCommand = PackmindCommand;

export type IGetTargetsByOrganizationUseCase = IUseCase<
  GetTargetsByOrganizationCommand,
  TargetWithRepository[]
>;
