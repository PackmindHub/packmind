import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import { ILearningsPort } from '@packmind/types';

const origin = 'LearningsAdapter';

/**
 * LearningsAdapter - Main adapter for the Learnings domain.
 * Implements the hexagonal architecture adapter pattern.
 *
 * Phase 1: Basic structure with no use cases.
 * Use cases will be added in Phase 2.
 */
export class LearningsAdapter
  implements IBaseAdapter<ILearningsPort>, ILearningsPort
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('LearningsAdapter constructed - awaiting initialization');
  }

  /**
   * Initialize adapter with ports from registry.
   * Phase 1: Empty implementation.
   * Phase 2: Will receive required ports (StandardsPort, RecipesPort, etc.)
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing LearningsAdapter');
    // Phase 1: No ports or use cases to initialize yet
    this.logger.info('LearningsAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready (all required dependencies initialized).
   * Phase 1: Always ready (no dependencies yet).
   */
  public isReady(): boolean {
    return true;
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): ILearningsPort {
    return this as ILearningsPort;
  }
}
