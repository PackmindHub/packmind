import { ChangeProposalId } from '../ChangeProposalId';

export class ChangeProposalPayloadParseError extends Error {
  constructor(changeProposalId: ChangeProposalId, detail: string) {
    super(
      `Change proposal "${changeProposalId}" has an invalid JSON payload: ${detail}`,
    );
    this.name = 'ChangeProposalPayloadParseError';
  }
}
