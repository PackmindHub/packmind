import { ArtefactDiff } from '../../../domain/useCases/IDiffArtefactsUseCase';
import { DiffableFile } from './DiffableFile';

export type DiffContext = {
  skillFolders: string[];
};

export interface IDiffStrategy {
  supports(file: DiffableFile): boolean;

  diff(
    file: DiffableFile,
    baseDirectory: string,
    context?: DiffContext,
  ): Promise<ArtefactDiff[]>;

  diffNewFiles?(
    folders: string[],
    serverFiles: DiffableFile[],
    baseDirectory: string,
  ): Promise<ArtefactDiff[]>;
}
