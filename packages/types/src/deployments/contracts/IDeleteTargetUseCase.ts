import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetId } from '../TargetId';

export type DeleteTargetCommand = PackmindCommand & {
  targetId: TargetId;
};

export type DeleteTargetResponse = {
  success: boolean;
};

export type IDeleteTargetUseCase = IUseCase<
  DeleteTargetCommand,
  DeleteTargetResponse
>;
