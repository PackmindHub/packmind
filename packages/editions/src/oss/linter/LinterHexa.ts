import { BaseHexa, HexaRegistry } from '@packmind/shared';
import {
  GenerateProgramCommand,
  GenerateProgramResponse,
} from './GenerateProgramCommand';

export class LinterHexa extends BaseHexa {
  constructor(registry: HexaRegistry) {
    super(registry);
  }

  public async initializeJobQueues(): Promise<void> {
    // Nothing to do here
  }

  public async generateProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GenerateProgramCommand,
  ): Promise<GenerateProgramResponse> {
    return {
      message: 'Unable to generate program',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}
}
