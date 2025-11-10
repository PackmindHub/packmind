import RAWGenerationStrategy from './raw/RAWGenerationStrategy';
import ASTGenerationStrategy from './ast/ASTGenerationStrategy';
import { SourceCodeState } from '@packmind/types';

export function createGenerationStrategy(sourceCodeState: SourceCodeState) {
  switch (sourceCodeState) {
    case 'AST':
      return new ASTGenerationStrategy(null, null);
    case 'RAW':
    default:
      return new RAWGenerationStrategy(null, null);
  }
}
