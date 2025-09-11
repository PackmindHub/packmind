import { IStandardsServices } from '../IStandardsServices';
import { StandardService } from './StandardService';
import { StandardVersionService } from './StandardVersionService';
import { StandardBookService } from './StandardBookService';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { PackmindLogger } from '@packmind/shared';
import { StandardSummaryService } from './StandardSummaryService';

export class StandardsServices implements IStandardsServices {
  private readonly standardService: StandardService;
  private readonly standardVersionService: StandardVersionService;
  private readonly standardBookService: StandardBookService;
  private readonly standardSummaryService: StandardSummaryService;

  constructor(
    private readonly standardsRepositories: IStandardsRepositories,
    private readonly logger: PackmindLogger,
  ) {
    this.standardService = new StandardService(
      this.standardsRepositories.getStandardRepository(),
      this.logger,
    );
    this.standardVersionService = new StandardVersionService(
      this.standardsRepositories.getStandardVersionRepository(),
      this.standardsRepositories.getRuleRepository(),
      this.standardsRepositories.getRuleExampleRepository(),
      this.logger,
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
}
