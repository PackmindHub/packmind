import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';
import { Standard } from '../Standard';

export type SampleInput = {
  type: 'language' | 'framework';
  id: string;
};

export type SampleError = {
  sampleId: string;
  type: 'language' | 'framework';
  error: string;
};

export type CreateStandardSamplesCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
  samples: SampleInput[];
};

export type CreateStandardSamplesResponse = {
  created: Standard[];
  errors: SampleError[];
};

export type ICreateStandardSamplesUseCase = IUseCase<
  CreateStandardSamplesCommand,
  CreateStandardSamplesResponse
>;
