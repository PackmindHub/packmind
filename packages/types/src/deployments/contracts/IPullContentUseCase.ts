import { IUseCase, PackmindCommand } from '../../UseCase';
import { FileUpdates } from '../FileUpdates';

export type IPullContentResponse = {
  fileUpdates: FileUpdates;
  skillFolders: string[]; // Full paths for rendered skill folders, e.g., [".claude/skills/my-skill", ".github/skills/my-skill"]
};

export type PullContentCommand = PackmindCommand & {
  packagesSlugs: string[];
  previousPackagesSlugs?: string[]; // Previously installed packages for change detection
  // Git target info for distribution history lookup (to detect skills removed from packages)
  gitRemoteUrl?: string;
  gitBranch?: string;
  relativePath?: string;
};

export type IPullContentUseCase = IUseCase<
  PullContentCommand,
  IPullContentResponse
>;
