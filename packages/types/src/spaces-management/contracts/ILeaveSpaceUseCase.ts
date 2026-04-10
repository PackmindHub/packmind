import { IUseCase, PackmindCommand } from '../../UseCase';

export type LeaveSpaceCommand = PackmindCommand & {
  spaceId: string;
};

export type LeaveSpaceResponse = Record<string, never>;

export type ILeaveSpaceUseCase = IUseCase<
  LeaveSpaceCommand,
  LeaveSpaceResponse
>;
