import { IUseCase, SpaceMemberCommand } from '../../UseCase';

export type LeaveSpaceCommand = SpaceMemberCommand;

export type LeaveSpaceResponse = Record<string, never>;

export type ILeaveSpaceUseCase = IUseCase<
  LeaveSpaceCommand,
  LeaveSpaceResponse
>;
