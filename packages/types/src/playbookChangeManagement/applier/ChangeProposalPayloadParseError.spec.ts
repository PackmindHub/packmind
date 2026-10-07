import { ChangeProposalPayloadParseError } from './ChangeProposalPayloadParseError';
import { createChangeProposalId } from '../ChangeProposalId';
import { isInternalError } from '../../errors';

describe('ChangeProposalPayloadParseError', () => {
  const changeProposalId = createChangeProposalId('cp-1');
  const parseFailure = new SyntaxError('Unexpected token');

  let error: ChangeProposalPayloadParseError;

  beforeEach(() => {
    error = new ChangeProposalPayloadParseError(changeProposalId, {
      cause: parseFailure,
    });
  });

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('carries the change_proposal_payload_unparsable reason', () => {
    expect(error.reason).toBe('change_proposal_payload_unparsable');
  });

  it('carries the change proposal id in its context', () => {
    expect(error.context).toEqual({ changeProposalId });
  });

  it('keeps the change proposal id out of the message', () => {
    expect(error.message).not.toContain(changeProposalId);
  });

  it('wraps the parse failure as its cause', () => {
    expect(error.cause).toBe(parseFailure);
  });

  it('sets the error name', () => {
    expect(error.name).toBe('ChangeProposalPayloadParseError');
  });
});
