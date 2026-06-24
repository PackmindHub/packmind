import {
  ActiveConfigurationSectionData,
  ActiveConfigurationState,
} from './types';
import {
  ActiveConfigurationSectionKey,
  ActiveConfigurationViewState,
  resolveActiveConfigurationView,
} from './viewState';

describe('resolveActiveConfigurationView', () => {
  const baseConfig: ActiveConfigurationSectionData = {
    id: 'config',
    language: 'ts',
    detectionProgram: null,
    draftProgram: null,
    state: ActiveConfigurationState.OK,
  };

  it('returns no configuration descriptor', () => {
    const descriptor = resolveActiveConfigurationView({
      ...baseConfig,
      state: ActiveConfigurationState.NO_CONFIG,
    });

    expect(descriptor).toEqual({
      viewState: ActiveConfigurationViewState.NO_CONFIGURATION,
      sectionKeys: [],
      hasDetectionProgram: false,
      hasDraftProgram: false,
    });
  });

  it('returns in progress descriptor', () => {
    const descriptor = resolveActiveConfigurationView({
      ...baseConfig,
      state: ActiveConfigurationState.IN_PROGRESS,
    });

    expect(descriptor.viewState).toBe(ActiveConfigurationViewState.IN_PROGRESS);
  });

  it('maps ok state to ready sections', () => {
    const descriptor = resolveActiveConfigurationView({
      ...baseConfig,
      state: ActiveConfigurationState.OK,
    });

    expect(descriptor).toEqual({
      viewState: ActiveConfigurationViewState.READY,
      sectionKeys: [
        ActiveConfigurationSectionKey.DETECTABILITY,
        ActiveConfigurationSectionKey.TEST_ACTIVE_VERSION,
        ActiveConfigurationSectionKey.FALSE_POSITIVES,
      ],
      hasDetectionProgram: false,
      hasDraftProgram: false,
    });
  });

  it('maps to review with detection program', () => {
    const descriptor = resolveActiveConfigurationView({
      ...baseConfig,
      detectionProgram: { id: 'dp' } as never,
      state: ActiveConfigurationState.TO_REVIEW,
    });

    expect(descriptor).toEqual({
      viewState: ActiveConfigurationViewState.TO_REVIEW_WITH_ACTIVE,
      sectionKeys: [
        ActiveConfigurationSectionKey.TO_REVIEW_CARD,
        ActiveConfigurationSectionKey.TEST_ACTIVE_VERSION,
        ActiveConfigurationSectionKey.FALSE_POSITIVES,
      ],
      hasDetectionProgram: true,
      hasDraftProgram: false,
    });
  });

  it('maps to review with draft only', () => {
    const descriptor = resolveActiveConfigurationView({
      ...baseConfig,
      draftProgram: { id: 'draft' } as never,
      state: ActiveConfigurationState.TO_REVIEW,
    });

    expect(descriptor).toEqual({
      viewState: ActiveConfigurationViewState.TO_REVIEW_DRAFT_ONLY,
      sectionKeys: [ActiveConfigurationSectionKey.DRAFT_REVIEW_SUMMARY],
      hasDetectionProgram: false,
      hasDraftProgram: true,
    });
  });

  describe('when state is error', () => {
    it('returns error view state', () => {
      const descriptor = resolveActiveConfigurationView({
        ...baseConfig,
        state: ActiveConfigurationState.ERROR,
      });

      expect(descriptor.viewState).toBe(ActiveConfigurationViewState.ERROR);
    });

    it('returns empty section keys', () => {
      const descriptor = resolveActiveConfigurationView({
        ...baseConfig,
        state: ActiveConfigurationState.ERROR,
      });

      expect(descriptor.sectionKeys).toEqual([]);
    });
  });
});
