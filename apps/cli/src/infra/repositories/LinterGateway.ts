import {
  Gateway,
  IGetDraftDetectionProgramForRule,
  IGetActiveDetectionProgramForRule,
  IGetDetectionProgramsForPackagesUseCase,
  GetDetectionProgramsForPackagesResponse,
  RuleId,
  ITrackLinterExecutionUseCase,
} from '@packmind/types';
import { ILinterGateway } from '../../domain/repositories/ILinterGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { handleScope } from '../../application/utils/handleScope';
import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';

export class LinterGateway implements ILinterGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  getDraftDetectionProgramsForRule: Gateway<IGetDraftDetectionProgramForRule> =
    async (command) => {
      const payload: {
        standardSlug: string;
        ruleId: RuleId;
        language?: string;
      } = {
        standardSlug: command.standardSlug,
        ruleId: command.ruleId,
      };

      if (command.language) {
        payload.language = command.language;
      }

      return this.httpClient.request('/api/v0/list-draft-detection-program', {
        method: 'POST',
        body: payload,
        onError: (response) => {
          if (response.status === 404) {
            throw new CommunityEditionError('local linting with packages');
          }
        },
      });
    };

  getActiveDetectionProgramsForRule: Gateway<IGetActiveDetectionProgramForRule> =
    async (command) => {
      const payload: {
        standardSlug: string;
        ruleId: RuleId;
        language?: string;
      } = {
        standardSlug: command.standardSlug,
        ruleId: command.ruleId,
      };

      if (command.language) {
        payload.language = command.language;
      }

      return this.httpClient.request('/api/v0/list-active-detection-program', {
        method: 'POST',
        body: payload,
        onError: (response) => {
          if (response.status === 404) {
            throw new CommunityEditionError('local linting with packages');
          }
        },
      });
    };

  getDetectionProgramsForPackages: Gateway<IGetDetectionProgramsForPackagesUseCase> =
    async (command) => {
      const response: GetDetectionProgramsForPackagesResponse =
        await this.httpClient.request(
          '/api/v0/detection-programs-for-packages',
          {
            method: 'POST',
            body: {
              packagesSlugs: command.packagesSlugs,
            },
            onError: (response) => {
              if (response.status === 404) {
                throw new CommunityEditionError('local linting with packages');
              }
            },
          },
        );

      return handleScopeInTargetsResponse(response);
    };

  trackLinterExecution: Gateway<ITrackLinterExecutionUseCase> = async () => {
    return this.httpClient.request(`/api/v0/trackLinterExecution`);
  };
}

type InvalidByTargetResponse = {
  targets: {
    standards: {
      scope: null | string | string[];
    }[];
  }[];
};

type ValidByTargetResponse<Target extends InvalidByTargetResponse> = Target & {
  targets: Omit<Target['targets'][number], 'standards'> &
    {
      standards: Omit<Target['targets'][number]['standards'][number], 'scope'> &
        {
          scope: string[];
        }[];
    }[];
};

function handleScopeInTargetsResponse<T extends InvalidByTargetResponse>(
  response: T,
): ValidByTargetResponse<T> {
  return {
    ...response,
    targets: response.targets.map((target) => {
      return {
        ...target,
        standards: target.standards.map((standard) => {
          return {
            ...standard,
            scope: handleScope(standard.scope),
          };
        }),
      };
    }),
  } as ValidByTargetResponse<T>;
}
