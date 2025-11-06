import { Rule, StandardId } from './index';
import { UserId } from '@packmind/types';
import { GitCommit } from '../git';

import { Branded, brandedIdFactory } from '@packmind/types';

export type StandardVersionId = Branded<'StandardVersionId'>;
export const createStandardVersionId = brandedIdFactory<StandardVersionId>();

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
