import { IUseCase, PackmindCommand } from '../../UseCase';

export type TrackLinterExecutionCommand = PackmindCommand & {
  targetCount: number;
  standardCount: number;
};

export type TrackLinterExecutionResponse = Record<string, never>;

export type ITrackLinterExecutionUseCase = IUseCase<
  TrackLinterExecutionCommand,
  TrackLinterExecutionResponse
>;
