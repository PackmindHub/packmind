import { IStandardsServices } from '../IStandardsServices';
import { StandardService } from './StandardService';
import { StandardVersionService } from './StandardVersionService';
import { StandardBookService } from './StandardBookService';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { PackmindLogger } from '@packmind/shared';
import { StandardSummaryService } from './StandardSummaryService';
import type { ILinterPort } from '@packmind/shared';

export class StandardsServices implements IStandardsServices {
  private readonly standardService: StandardService;
  private readonly standardVersionService: StandardVersionService;
  private readonly standardBookService: StandardBookService;
  private readonly standardSummaryService: StandardSummaryService;

  constructor(
    private readonly standardsRepositories: IStandardsRepositories,
    private readonly logger: PackmindLogger,
    private linterAdapter?: ILinterPort,
  ) {
    this.standardService = new StandardService(
      this.standardsRepositories.getStandardRepository(),
    );
    this.standardVersionService = new StandardVersionService(
      this.standardsRepositories.getStandardVersionRepository(),
      this.standardsRepositories.getRuleRepository(),
      this.standardsRepositories.getRuleExampleRepository(),
      this.linterAdapter,
      // Don't pass logger - let StandardVersionService create its own with correct origin
    );
    this.standardBookService = new StandardBookService();
    this.standardSummaryService = new StandardSummaryService();
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

  getStandardSummaryService(): StandardSummaryService {
    return this.standardSummaryService;
  }

  getLinterAdapter(): ILinterPort | undefined {
    return this.linterAdapter;
  }

  setLinterAdapter(adapter: ILinterPort): void {
    this.linterAdapter = adapter;
    this.standardVersionService.linterAdapter = adapter;
  }
}
