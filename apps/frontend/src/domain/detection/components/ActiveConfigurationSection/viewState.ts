import {
  ActiveConfigurationSectionData,
  ActiveConfigurationState,
} from './types';

export enum ActiveConfigurationViewState {
  NO_CONFIGURATION = 'noConfiguration',
  IN_PROGRESS = 'inProgress',
  READY = 'ready',
  TO_REVIEW_WITH_ACTIVE = 'toReviewWithActive',
  TO_REVIEW_DRAFT_ONLY = 'toReviewDraftOnly',
  ERROR = 'error',
}

export enum ActiveConfigurationSectionKey {
  DETECTABILITY = 'detectability',
  TEST_ACTIVE_VERSION = 'testActiveVersion',
  FALSE_POSITIVES = 'falsePositives',
  TO_REVIEW_CARD = 'toReviewCard',
  DRAFT_REVIEW_SUMMARY = 'draftReviewSummary',
}

export type ActiveConfigurationViewDescriptor = {
  viewState: ActiveConfigurationViewState;
  sectionKeys: ActiveConfigurationSectionKey[];
  hasDetectionProgram: boolean;
  hasDraftProgram: boolean;
};

const SECTIONS_BY_VIEW_STATE: Record<
  ActiveConfigurationViewState,
  ActiveConfigurationSectionKey[]
> = {
  [ActiveConfigurationViewState.NO_CONFIGURATION]: [],
  [ActiveConfigurationViewState.IN_PROGRESS]: [],
  [ActiveConfigurationViewState.READY]: [
    ActiveConfigurationSectionKey.DETECTABILITY,
    ActiveConfigurationSectionKey.TEST_ACTIVE_VERSION,
    ActiveConfigurationSectionKey.FALSE_POSITIVES,
  ],
  [ActiveConfigurationViewState.TO_REVIEW_WITH_ACTIVE]: [
    ActiveConfigurationSectionKey.TO_REVIEW_CARD,
    ActiveConfigurationSectionKey.TEST_ACTIVE_VERSION,
    ActiveConfigurationSectionKey.FALSE_POSITIVES,
  ],
  [ActiveConfigurationViewState.TO_REVIEW_DRAFT_ONLY]: [
    ActiveConfigurationSectionKey.DRAFT_REVIEW_SUMMARY,
  ],
  [ActiveConfigurationViewState.ERROR]: [],
};

export function resolveActiveConfigurationView(
  configuration: ActiveConfigurationSectionData,
): ActiveConfigurationViewDescriptor {
  const hasDetectionProgram = Boolean(configuration.detectionProgram);
  const hasDraftProgram = Boolean(configuration.draftProgram);

  let viewState: ActiveConfigurationViewState;
  switch (configuration.state) {
    case ActiveConfigurationState.NO_CONFIG:
      viewState = ActiveConfigurationViewState.NO_CONFIGURATION;
      break;
    case ActiveConfigurationState.IN_PROGRESS:
      viewState = ActiveConfigurationViewState.IN_PROGRESS;
      break;
    case ActiveConfigurationState.OK:
      viewState = ActiveConfigurationViewState.READY;
      break;
    case ActiveConfigurationState.TO_REVIEW:
      viewState = hasDetectionProgram
        ? ActiveConfigurationViewState.TO_REVIEW_WITH_ACTIVE
        : ActiveConfigurationViewState.TO_REVIEW_DRAFT_ONLY;
      break;
    case ActiveConfigurationState.ERROR:
    default:
      viewState = ActiveConfigurationViewState.ERROR;
      break;
  }

  return {
    viewState,
    sectionKeys: SECTIONS_BY_VIEW_STATE[viewState],
    hasDetectionProgram,
    hasDraftProgram,
  };
}
