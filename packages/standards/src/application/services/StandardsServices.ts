import { StandardService } from './StandardService';
import { StandardVersionService } from './StandardVersionService';
import { instrumentComponents } from '@packmind/node-utils';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import type { ILinterPort } from '@packmind/types';

export class StandardsServices {
  private readonly standardService: StandardService;
  private readonly standardVersionService: StandardVersionService;

  constructor(
    private readonly standardsRepositories: IStandardsRepositories,
    private linterAdapter?: ILinterPort,
  ) {
    this.standardService = new StandardService(
      this.standardsRepositories.getStandardRepository(),
      this.standardsRepositories.getStandardVersionRepository(),
      this.standardsRepositories.getRuleRepository(),
      this.standardsRepositories.getRuleExampleRepository(),
    );
    this.standardVersionService = new StandardVersionService(
      this.standardsRepositories.getStandardVersionRepository(),
      this.standardsRepositories.getRuleRepository(),
      this.standardsRepositories.getRuleExampleRepository(),
      this.linterAdapter,
      // Don't pass logger - let StandardVersionService create its own with correct origin
    );

    // Services are where the domain logic that is not a query lives, and they
    // have no shared base class to hook - so the aggregator is the seam.
    instrumentComponents([this.standardService, this.standardVersionService]);
  }

  getStandardService(): StandardService {
    return this.standardService;
  }

  getStandardVersionService(): StandardVersionService {
    return this.standardVersionService;
  }

  setLinterAdapter(adapter: ILinterPort): void {
    this.linterAdapter = adapter;
    this.standardVersionService.linterAdapter = adapter;
  }
}
