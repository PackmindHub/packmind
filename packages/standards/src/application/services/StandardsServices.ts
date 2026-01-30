import { StandardService } from './StandardService';
import { StandardVersionService } from './StandardVersionService';
import { StandardBookService } from './StandardBookService';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { PackmindLogger } from '@packmind/logger';
import { StandardSummaryService } from './StandardSummaryService';
import type { ILinterPort, ILlmPort } from '@packmind/types';

export class StandardsServices {
  private readonly standardService: StandardService;
  private readonly standardVersionService: StandardVersionService;
  private readonly standardBookService: StandardBookService;
  private standardSummaryService: StandardSummaryService;

  constructor(
    private readonly standardsRepositories: IStandardsRepositories,
    private linterAdapter?: ILinterPort,
    private llmPort?: ILlmPort,
  ) {
    const logger = new PackmindLogger('StandardsServices');
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
    // StandardSummaryService created with llmPort (may be undefined initially)
    this.standardSummaryService = new StandardSummaryService(this.llmPort);
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

  setLlmPort(port: ILlmPort): void {
    this.llmPort = port;
    // Recreate StandardSummaryService with the llmPort
    this.standardSummaryService = new StandardSummaryService(this.llmPort);
  }
}
