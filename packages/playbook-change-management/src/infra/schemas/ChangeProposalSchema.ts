import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { ChangeProposal } from '@packmind/types';

export const ChangeProposalSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<ChangeProposal>>
>({
  name: 'ChangeProposal',
  tableName: 'change_proposals',
  columns: {
    type: { type: 'varchar' },
    artefactId: { name: 'artefact_id', type: 'varchar', nullable: true },
    artefactVersion: { name: 'artefact_version', type: 'int' },
    spaceId: { name: 'space_id', type: 'uuid' },
    gitRepoId: { name: 'git_repo_id', type: 'uuid', nullable: true },
    targetId: { name: 'target_id', type: 'uuid', nullable: true },
    payload: { type: 'jsonb' },
    captureMode: { name: 'capture_mode', type: 'varchar' },
    message: { type: 'varchar', length: 1024, default: "''" },
    status: { type: 'varchar' },
    createdBy: { name: 'created_by', type: 'uuid' },
    resolvedBy: { name: 'resolved_by', type: 'uuid', nullable: true },
    resolvedAt: {
      name: 'resolved_at',
      type: 'timestamp with time zone',
      nullable: true,
    },
    decision: {
      type: 'jsonb',
      nullable: true,
      default: null,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  indices: [
    { name: 'idx_change_proposal_artefact', columns: ['artefactId'] },
    { name: 'idx_change_proposal_space', columns: ['spaceId'] },
    { name: 'idx_change_proposal_status', columns: ['status'] },
  ],
});
