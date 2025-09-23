import { IUseCase, PackmindCommand } from '../../UseCase';
import { Target, TargetId } from '../Target';

export type UpdateTargetCommand = PackmindCommand & {
  targetId: TargetId;
  name: string;
  path: string;
};

export type IUpdateTargetUseCase = IUseCase<UpdateTargetCommand, Target>;
