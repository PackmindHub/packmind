import { v4 as uuidv4 } from 'uuid';
import { ChangeProposalType, createChangeProposalId } from '@packmind/types';
import { FieldChange, trackScalarChange } from './changeProposalHelpers';

describe('trackScalarChange', () => {
  const makeProposal = (type: ChangeProposalType) => ({
    id: createChangeProposalId(uuidv4()),
    type,
  });

  it('sets changes[field] when proposals match the type', () => {
    const proposal = makeProposal(ChangeProposalType.updateStandardName);
    const changes: Record<string, FieldChange | undefined> = {};

    trackScalarChange(
      changes,
      'name',
      'Original',
      'Updated',
      [proposal],
      ChangeProposalType.updateStandardName,
    );

    expect(changes['name']).toEqual({
      originalValue: 'Original',
      finalValue: 'Updated',
      proposalIds: [proposal.id],
    });
  });

  it('does not set field when no proposals match the type', () => {
    const proposal = makeProposal(ChangeProposalType.updateStandardDescription);
    const changes: Record<string, FieldChange | undefined> = {};

    trackScalarChange(
      changes,
      'name',
      'Original',
      'Updated',
      [proposal],
      ChangeProposalType.updateStandardName,
    );

    expect(changes['name']).toBeUndefined();
  });

  it('includes all matching proposal IDs when multiple match', () => {
    const proposal1 = makeProposal(ChangeProposalType.updateStandardName);
    const proposal2 = makeProposal(ChangeProposalType.updateStandardName);
    const unrelated = makeProposal(
      ChangeProposalType.updateStandardDescription,
    );
    const changes: Record<string, FieldChange | undefined> = {};

    trackScalarChange(
      changes,
      'name',
      'Original',
      'Final',
      [proposal1, unrelated, proposal2],
      ChangeProposalType.updateStandardName,
    );

    expect(changes['name']).toEqual({
      originalValue: 'Original',
      finalValue: 'Final',
      proposalIds: [proposal1.id, proposal2.id],
    });
  });

  it('does not set field when proposals array is empty', () => {
    const changes: Record<string, FieldChange | undefined> = {};

    trackScalarChange(
      changes,
      'name',
      'Original',
      'Updated',
      [],
      ChangeProposalType.updateStandardName,
    );

    expect(changes['name']).toBeUndefined();
  });
});
