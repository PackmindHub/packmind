import { IUseCase, PackmindCommand } from '../../UseCase';
import { Target } from '../Target';
import { TargetId } from '../TargetId';

export type UpdateTargetCommand = PackmindCommand & {
  targetId: TargetId;
  name: string;
  path: string;
};

export type IUpdateTargetUseCase = IUseCase<UpdateTargetCommand, Target>;
