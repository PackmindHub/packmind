import { IUseCase, PackmindCommand } from '@packmind/types';
import { TargetWithRepository } from '../TargetWithRepository';

export type GetTargetsByOrganizationCommand = PackmindCommand;

export type IGetTargetsByOrganizationUseCase = IUseCase<
  GetTargetsByOrganizationCommand,
  TargetWithRepository[]
>;
