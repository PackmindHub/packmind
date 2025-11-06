import { StandardVersionId } from './StandardVersionId';
import { StandardId } from './StandardId';
import { Rule } from './Rule';
import { UserId } from '../accounts/User';
import { GitCommit } from '../git/GitCommit';

export type StandardVersion = {
  id: StandardVersionId;
  standardId: StandardId;
  name: string;
  slug: string;
  description: string;
  version: number;
  summary?: string | null;
  gitCommit?: GitCommit;
  userId?: UserId | null; // User who created this version through Web UI, null for git commits
  scope: string | null;
  rules?: Rule[];
};
