import {
  Target,
  IUpdateTargetUseCase,
  UpdateTargetCommand,
} from '@packmind/types';
import { TargetService } from '../services/TargetService';

export class UpdateTargetUseCase implements IUpdateTargetUseCase {
  constructor(private readonly targetService: TargetService) {}

  async execute(command: UpdateTargetCommand): Promise<Target> {
    const { targetId, name, path } = command;

    // Validate target name is not empty
    if (!name || name.trim().length === 0) {
      throw new Error('Target name cannot be empty');
    }

    // Validate path format (basic validation for directory paths)
    if (!path || (path !== '/' && !path.match(new RegExp('\\/.+(?=\\/)\\/')))) {
      throw new Error('Invalid path format');
    }

    // Prevent path traversal attacks
    if (path.includes('..')) {
      throw new Error('Invalid path format');
    }

    const updates = {
      name: name.trim(),
      path,
    };

    return this.targetService.updateTarget(targetId, updates);
  }
}
