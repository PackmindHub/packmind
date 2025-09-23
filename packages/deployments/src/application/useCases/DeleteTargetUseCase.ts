import {
  IDeleteTargetUseCase,
  DeleteTargetCommand,
  DeleteTargetResponse,
} from '@packmind/shared';
import { TargetService } from '../services/TargetService';

export class DeleteTargetUseCase implements IDeleteTargetUseCase {
  constructor(private readonly targetService: TargetService) {}

  async execute(command: DeleteTargetCommand): Promise<DeleteTargetResponse> {
    const { targetId } = command;

    await this.targetService.deleteTarget(targetId);

    return { success: true };
  }
}
