import { StandardService } from './services/StandardService';
import { StandardVersionService } from './services/StandardVersionService';
import { StandardBookService } from './services/StandardBookService';
import { StandardSummaryService } from './services/StandardSummaryService';

export interface IStandardsServices {
  getStandardService(): StandardService;
  getStandardVersionService(): StandardVersionService;
  getStandardBookService(): StandardBookService;
  getStandardSummaryService(): StandardSummaryService;
}
