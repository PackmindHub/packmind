import {
  IPackagesGateway,
  CreatePackageCommand,
  CreatePackageResult,
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResult,
} from '../../domain/repositories/IPackagesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import {
  IGetPackageSummaryUseCase,
  IListPackagesUseCase,
  Gateway,
} from '@packmind/types';

export class PackagesGateway implements IPackagesGateway {
  constructor(
    private readonly apiKey: string,
    private readonly httpClient: PackmindHttpClient,
  ) {}

  public list: Gateway<IListPackagesUseCase> = async () => {
    const { organizationId } = this.httpClient.getAuthContext();

    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/packages`,
    );
  };

  public getSummary: Gateway<IGetPackageSummaryUseCase> = async ({ slug }) => {
    const { organizationId } = this.httpClient.getAuthContext();

    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/packages/${encodeURIComponent(slug)}`,
    );
  };

  public create = async (
    spaceId: string,
    data: CreatePackageCommand,
  ): Promise<CreatePackageResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    const response = await this.httpClient.request<{
      package: CreatePackageResult;
    }>(`/api/v0/organizations/${organizationId}/spaces/${spaceId}/packages`, {
      method: 'POST',
      body: data,
    });
    return response.package;
  };

  public addArtefacts = async (
    command: AddArtefactsToPackageCommand,
  ): Promise<AddArtefactsToPackageResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    const { packageSlug, spaceId, standardIds, commandIds, skillIds } = command;

    const body: Record<string, string[] | undefined> = {};
    if (standardIds?.length) body.standardIds = standardIds;
    if (commandIds?.length) body.commandIds = commandIds;
    if (skillIds?.length) body.skillIds = skillIds;

    const response = await this.httpClient.request<{
      added: { standards: string[]; commands: string[]; skills: string[] };
      skipped: { standards: string[]; commands: string[]; skills: string[] };
    }>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/packages/${encodeURIComponent(packageSlug)}/add-artifacts`,
      {
        method: 'POST',
        body,
      },
    );

    return {
      added: response.added,
      skipped: response.skipped,
    };
  };
}
