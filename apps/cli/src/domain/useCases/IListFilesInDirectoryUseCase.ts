import { IPublicUseCase } from '@packmind/shared';
import {
  ListFilesInDirectoryUseCaseCommand,
  ListFilesInDirectoryUseCaseResult,
} from '../../application/useCases/ListFilesInDirectoryUseCase';

export type IListFilesInDirectoryUseCase = IPublicUseCase<
  ListFilesInDirectoryUseCaseCommand,
  ListFilesInDirectoryUseCaseResult
>;
