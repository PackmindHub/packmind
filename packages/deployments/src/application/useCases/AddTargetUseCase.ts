import {
  Target,
  createTargetId,
  IAddTargetUseCase,
  AddTargetCommand,
} from '@packmind/types';
import { TargetService } from '../services/TargetService';
import { v4 as uuidv4 } from 'uuid';

export class AddTargetUseCase implements IAddTargetUseCase {
  constructor(private readonly targetService: TargetService) {}

  async execute(command: AddTargetCommand): Promise<Target> {
    const { name, path, gitRepoId } = command;

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

    const target: Target = {
      id: createTargetId(uuidv4()),
      name: name.trim(),
      path,
      gitRepoId,
    };

    return this.targetService.addTarget(target);
  }
}
