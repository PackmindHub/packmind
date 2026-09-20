import { ArtifactType } from '@packmind/types';
import { DeploymentsError } from './DeploymentsError';

const LABELS: Record<ArtifactType, string> = {
  command: 'Command',
  standard: 'Standard',
  skill: 'Skill',
};

/**
 * The artefact cannot be added to a package because it is not in the
 * package's space — whether it never existed or lives in another space.
 *
 * Both cases answer the same thing for the same reason as
 * `SpaceNotAccessibleError`: saying "it exists, but elsewhere" tells a caller
 * about an artefact they cannot see. Which of the two it was stays in the log,
 * as the `spaceId` the lookup was scoped to.
 */
export class ArtefactNotInSpaceError extends DeploymentsError {
  constructor(artefactType: ArtifactType, artefactId: string, spaceId: string) {
    super(
      'not_found',
      'artefact_not_in_space',
      { artefactType, artefactId, spaceId },
      `${LABELS[artefactType]} with id "${artefactId}" was not found in this space.`,
    );
    this.name = 'ArtefactNotInSpaceError';
    Object.setPrototypeOf(this, ArtefactNotInSpaceError.prototype);
  }
}
