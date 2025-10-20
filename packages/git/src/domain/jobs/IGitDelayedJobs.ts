import { FetchFileContentDelayedJob } from '../../application/jobs/FetchFileContentDelayedJob';

export interface IGitDelayedJobs {
  fetchFileContentDelayedJob: FetchFileContentDelayedJob;
}
