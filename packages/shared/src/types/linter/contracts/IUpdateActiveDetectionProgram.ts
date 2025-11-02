import { IUseCase, PackmindCommand } from '../../UseCase';
import { ActiveDetectionProgram } from '../ActiveDetectionProgram';
import { DetectionProgramId } from '../DetectionProgram';

export type UpdateActiveDetectionProgramCommand = PackmindCommand & {
  activeDetectionProgram: ActiveDetectionProgram;
  newDetectionProgramVersion?: DetectionProgramId;
  newDetectionProgramDraftVersion?: DetectionProgramId | null;
};

export type IUpdateActiveDetectionProgramUseCase = IUseCase<
  UpdateActiveDetectionProgramCommand,
  ActiveDetectionProgram
>;
