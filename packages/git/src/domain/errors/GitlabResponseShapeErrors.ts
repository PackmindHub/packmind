import { GitInternalError } from './GitInternalError';

/**
 * The two ways a GitLab tree listing can come back as something other than
 * the array of entries we asked for: the body carries an error message
 * instead, or it is simply not an array. Neither is anything a request
 * carries or can correct, and both are caught by the surrounding handler and
 * rewrapped as `GitlabApiOperationFailedError`, so they never reach a client
 * on their own.
 */

export class GitlabApiErrorResponseError extends GitInternalError {
  constructor(projectPath: string, branch: string, apiMessage?: string) {
    super(
      'gitlab_api_error_response',
      { projectPath, branch },
      `GitLab API error: ${apiMessage}`,
    );
    this.name = 'GitlabApiErrorResponseError';
  }
}

export class GitlabUnexpectedResponseFormatError extends GitInternalError {
  constructor(projectPath: string, branch: string) {
    super(
      'gitlab_unexpected_response_format',
      { projectPath, branch },
      'GitLab API did not return an array - unexpected response format',
    );
    this.name = 'GitlabUnexpectedResponseFormatError';
  }
}
