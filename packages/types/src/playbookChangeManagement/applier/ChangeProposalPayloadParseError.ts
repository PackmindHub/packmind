import { PackmindErrorOptions, PackmindInternalError } from '../../errors';
import { ChangeProposalId } from '../ChangeProposalId';

/**
 * A stored proposal whose JSON-encoded value does not parse. The payload is
 * read back from the database and must match it, so the reviewer applying it
 * cannot correct it: a broken invariant, not their input.
 */
export class ChangeProposalPayloadParseError extends PackmindInternalError {
  constructor(
    changeProposalId: ChangeProposalId,
    options?: PackmindErrorOptions,
  ) {
    super(
      'change_proposal_payload_unparsable',
      { changeProposalId },
      'Change proposal payload is not valid JSON',
      options,
    );
    this.name = 'ChangeProposalPayloadParseError';
  }
}
