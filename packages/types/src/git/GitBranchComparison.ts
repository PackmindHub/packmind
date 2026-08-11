/**
 * How a single file changed between two branches.
 *
 * Renames are normalized away by the providers: a renamed file is reported as
 * a `removed` entry for the old path plus an `added` entry for the new one, so
 * consumers never have to special-case a fourth status.
 */
export type GitFileChangeStatus = 'added' | 'removed' | 'modified';

export type GitFileChange = {
  path: string;
  status: GitFileChangeStatus;
};

/**
 * File-level diff between a base branch and a head branch, as reported by the
 * git host's compare endpoint.
 *
 * `truncated` is set when the provider could not return the complete file list
 * (GitHub caps compare responses, GitLab times large comparisons out). Callers
 * that summarize the diff must surface that the summary is partial rather than
 * presenting it as exhaustive.
 */
export type GitBranchComparison = {
  files: GitFileChange[];
  truncated: boolean;
};
