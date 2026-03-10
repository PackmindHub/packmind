import { v4 as uuidv4 } from 'uuid';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';
import { ChangeProposalStatus } from '../ChangeProposalStatus';
import { ChangeProposalCaptureMode } from '../ChangeProposalCaptureMode';
import { createChangeProposalId } from '../ChangeProposalId';
import { createSpaceId } from '../../spaces/SpaceId';
import { createUserId } from '../../accounts/User';

export const createChangeProposalFactory =
  (createArtefactId: (id: string) => string) =>
  <T extends ChangeProposalType>(
    overrides: Partial<ChangeProposal<T>> & {
      type: T;
      payload: ChangeProposal<T>['payload'];
    },
  ): ChangeProposal<T> =>
    ({
      id: createChangeProposalId(uuidv4()),
      artefactId: createArtefactId(uuidv4()),
      artefactVersion: 1,
      spaceId: createSpaceId(uuidv4()),
      captureMode: ChangeProposalCaptureMode.commit,
      message: '',
      status: ChangeProposalStatus.pending,
      decision: null,
      createdBy: createUserId(uuidv4()),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ChangeProposal<T>;
