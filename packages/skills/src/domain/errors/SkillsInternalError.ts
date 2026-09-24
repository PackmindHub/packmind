import { PackmindInternalError } from '@packmind/types';

export type SkillsInternalErrorReason =
  | 'port_not_available'
  | 'skill_version_missing'
  | 'skills_adapter_ports_missing'
  | 'hexa_dependency_missing';

export type SkillsInternalErrorContext = {
  skillId?: string;
  port?: string;
  missingPorts?: string[];
  dependency?: string;
};

/**
 * Base for the skills broken invariants, in the same shape as
 * `SkillsError` but on the internal side: no `kind` to choose — it is
 * always 500, logged with its stack and with its message withheld from the
 * client — a literal `reason` union naming the invariant and a typed `context`
 * carrying the ids.
 *
 * The line between this and `SkillsError` is fault, not severity: if the
 * caller could have avoided it by asking for something else, it is a
 * `SkillsError`. If the wiring is broken or an already-created skill has lost
 * its version, it is this.
 */
export class SkillsInternalError extends PackmindInternalError {
  constructor(
    reason: SkillsInternalErrorReason,
    context: SkillsInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'SkillsInternalError';
  }
}
