import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  uuidSchema,
  timestampsSchemas,
} from '@packmind/node-utils';
import { ChangeProposal } from '@packmind/types';

export const ChangeProposalSchema = new EntitySchema<
  WithTimestamps<ChangeProposal>
>({
  name: 'ChangeProposal',
  tableName: 'change_proposals',
  columns: {
    type: { type: 'varchar' },
    artefactId: { name: 'artefact_id', type: 'varchar' },
    artefactVersion: { name: 'artefact_version', type: 'int' },
    spaceId: { name: 'space_id', type: 'uuid' },
    payload: { type: 'jsonb' },
    captureMode: { name: 'capture_mode', type: 'varchar' },
    status: { type: 'varchar' },
    createdBy: { name: 'created_by', type: 'uuid' },
    resolvedBy: { name: 'resolved_by', type: 'uuid', nullable: true },
    resolvedAt: {
      name: 'resolved_at',
      type: 'timestamp with time zone',
      nullable: true,
    },
    ...uuidSchema,
    ...timestampsSchemas,
  },
  indices: [
    { name: 'idx_change_proposal_artefact', columns: ['artefactId'] },
    { name: 'idx_change_proposal_space', columns: ['spaceId'] },
    { name: 'idx_change_proposal_status', columns: ['status'] },
  ],
});
