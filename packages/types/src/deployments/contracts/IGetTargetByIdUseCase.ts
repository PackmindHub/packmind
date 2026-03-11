import { IUseCase, PackmindCommand } from '../../UseCase';
import { Target } from '../Target';
import { TargetId } from '../TargetId';

export type GetTargetByIdCommand = PackmindCommand & {
  targetId: TargetId;
};

export type GetTargetByIdResponse = {
  target: Target | null;
};

export type IGetTargetByIdUseCase = IUseCase<
  GetTargetByIdCommand,
  GetTargetByIdResponse
>;
