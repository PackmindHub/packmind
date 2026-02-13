import { ArtefactDiff } from '../../../domain/useCases/IDiffArtefactsUseCase';
import { DiffableFile } from './DiffableFile';

export interface IDiffStrategy {
  supports(file: DiffableFile): boolean;

  diff(file: DiffableFile, baseDirectory: string): Promise<ArtefactDiff[]>;
}
