import { IPublicUseCase } from '@packmind/types';
import {
  ListFilesInDirectoryUseCaseCommand,
  ListFilesInDirectoryUseCaseResult,
} from '../../application/useCases/ListFilesInDirectoryUseCase';

export type IListFilesInDirectoryUseCase = IPublicUseCase<
  ListFilesInDirectoryUseCaseCommand,
  ListFilesInDirectoryUseCaseResult
>;
