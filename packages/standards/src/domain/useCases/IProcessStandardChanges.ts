import {
  IUseCase,
  OrganizationId,
  UserId,
  StandardVersion,
} from '@packmind/types';

export type StandardChange = {
  newRule: string;
  oldRule?: string;
  operation: string;
  standard: string;
};

export type ProcessStandardChangesCommand = {
  userId: UserId;
  organizationId: OrganizationId;
  changes: StandardChange[];
};

export type ProcessStandardChangesResult = {
  succeeded: Array<{
    standardSlug: string;
    rule: string;
    standardVersion: StandardVersion;
  }>;
  failed: Array<{
    standardSlug: string;
    rule: string;
    error: string;
  }>;
};

export type IProcessStandardChanges = IUseCase<
  ProcessStandardChangesCommand,
  ProcessStandardChangesResult
>;
