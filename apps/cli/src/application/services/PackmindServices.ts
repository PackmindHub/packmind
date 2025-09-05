import { ListFiles } from './ListFiles';
import { GitService } from './GitService';
import { AstExecutorService } from './AstExecutorService';

export interface PackmindServices {
  listFiles: ListFiles;
  gitRemoteUrlService: GitService;
  astExecutorService: AstExecutorService;
}
