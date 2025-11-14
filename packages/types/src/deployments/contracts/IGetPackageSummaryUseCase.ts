import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';

export type GetPackageSummaryCommand = PackmindCommand & {
  organizationId: OrganizationId;
  slug: string;
};

export type SummarizedArtifact = {
  name: string;
  summary?: string;
};

export type GetPackageSummaryResponse = {
  name: string;
  slug: string;
  description: string;
  recipes: SummarizedArtifact[];
  standards: SummarizedArtifact[];
};

export type IGetPackageSummaryUseCase = IUseCase<
  GetPackageSummaryCommand,
  GetPackageSummaryResponse
>;
