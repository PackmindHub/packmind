import { ArtifactType, DeploymentsError } from '@packmind/types';

const LABELS: Record<ArtifactType, string> = {
  command: 'Command',
  standard: 'Standard',
  skill: 'Skill',
};

/** One artefact the caller asked to add, and the package that already holds it. */
export type ArtefactPlacementConflict = {
  artefactType: ArtifactType;
  artefactId: string;
  artefactName: string;
  packageName: string;
};

const describe = ({
  artefactType,
  artefactName,
  packageName,
}: ArtefactPlacementConflict) =>
  `${LABELS[artefactType].toLowerCase()} "${artefactName}" is in "${packageName}"`;

/**
 * The caller asked to add an artefact that already belongs to another package.
 *
 * `conflict`, not `invalid_input`: the request is well-formed and was true when
 * it was written. It is the space that moved — someone else placed the artefact
 * between the caller reading the packages and sending this — which is exactly
 * the 409 case, and the reason this is answered rather than silently resolved.
 * Adding it anyway would put one artefact in two packages that then drift
 * apart; taking it out of the other one is a decision with a losing side, and
 * not one to make on behalf of a caller who never saw the conflict.
 *
 * The message is written to stand on its own, against the grain of the rest of
 * these errors. `DomainExceptionFilter` sends `{ statusCode, message, reason }`
 * and no context, and the CLI versions in the field print that message and
 * nothing else — they have no branch for this reason and cannot add a word to
 * it. So it names the artefact, names the package holding it, and says what to
 * do, in a sentence that reads the same in a terminal and in a toast.
 *
 * Names rather than ids, for the same reason: an id in a message is unreadable
 * where a name is what the caller typed. Both are in the context for the log,
 * where ids belong.
 */
export class ArtefactAlreadyInAnotherPackageError extends DeploymentsError {
  constructor(
    readonly conflicts: ArtefactPlacementConflict[],
    targetPackageName: string,
  ) {
    super(
      'conflict',
      'artefact_already_in_another_package',
      {
        targetPackageName,
        conflicts: conflicts.map(
          ({ artefactType, artefactId, packageName }) => ({
            artefactType,
            artefactId,
            packageName,
          }),
        ),
      },
      conflicts.length === 1
        ? `The ${describe(conflicts[0])}, and an artefact belongs to a single package. Move it to "${targetPackageName}" instead of adding it.`
        : `${conflicts.length} artefacts are already in another package — ${conflicts
            .map(describe)
            .join(
              ', ',
            )} — and an artefact belongs to a single package. Move them to "${targetPackageName}" instead of adding them.`,
    );
    this.name = 'ArtefactAlreadyInAnotherPackageError';
  }
}
