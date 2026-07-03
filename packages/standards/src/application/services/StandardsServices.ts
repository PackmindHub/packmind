import { StandardService } from './StandardService';
import { StandardVersionService } from './StandardVersionService';
import { StandardBookService } from './StandardBookService';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import type { ILinterPort } from '@packmind/types';

export class StandardsServices {
  private readonly standardService: StandardService;
  private readonly standardVersionService: StandardVersionService;
  private readonly standardBookService: StandardBookService;

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
    this.standardBookService = new StandardBookService();
  }

  getStandardService(): StandardService {
    return this.standardService;
  }

  getStandardVersionService(): StandardVersionService {
    return this.standardVersionService;
  }

  getStandardBookService(): StandardBookService {
    return this.standardBookService;
  }

  getLinterAdapter(): ILinterPort | undefined {
    return this.linterAdapter;
  }

  setLinterAdapter(adapter: ILinterPort): void {
    this.linterAdapter = adapter;
    this.standardVersionService.linterAdapter = adapter;
  }
}
