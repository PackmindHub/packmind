import { IPublicUseCase } from '@packmind/types';
import {
  GetGitRemoteUrlUseCaseCommand,
  GetGitRemoteUrlUseCaseResult,
} from '../../application/useCases/GetGitRemoteUrlUseCase';

export type IGetGitRemoteUrlUseCase = IPublicUseCase<
  GetGitRemoteUrlUseCaseCommand,
  GetGitRemoteUrlUseCaseResult
>;
