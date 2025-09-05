import { IPublicUseCase } from '@packmind/shared';
import {
  GetGitRemoteUrlUseCaseCommand,
  GetGitRemoteUrlUseCaseResult,
} from '../../application/useCases/GetGitRemoteUrlUseCase';

export type IGetGitRemoteUrlUseCase = IPublicUseCase<
  GetGitRemoteUrlUseCaseCommand,
  GetGitRemoteUrlUseCaseResult
>;
