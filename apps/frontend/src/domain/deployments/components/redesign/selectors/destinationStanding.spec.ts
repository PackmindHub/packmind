import {
  destinationStanding,
  needsAttention,
  type DestinationStandingInput,
} from './destinationStanding';

/**
 * The baseline of the issue's matrix: package `ops` has release `0.1.0`, and a
 * skill added after it is still unreleased.
 */
const standing = (overrides: Partial<DestinationStandingInput> = {}) =>
  destinationStanding({
    versionSpec: '*',
    latestReleaseVersion: '0.1.0',
    hasUnreleasedChanges: true,
    behindArtifactCount: 0,
    ...overrides,
  });

describe('destinationStanding', () => {
  describe('when the destination is pinned to a release', () => {
    describe('and a newer release exists', () => {
      const pinnedWithNewerRelease = {
        versionSpec: '0.1.0',
        latestReleaseVersion: '0.2.0',
      };

      it('reads as behind', () => {
        expect(standing(pinnedWithNewerRelease).status).toBe('behind');
      });

      it('offers to distribute that release', () => {
        expect(standing(pinnedWithNewerRelease).remedy).toBe('update');
      });

      describe('and the package has moved on since that release', () => {
        it('still offers to distribute it', () => {
          expect(
            standing({ ...pinnedWithNewerRelease, hasUnreleasedChanges: true })
              .remedy,
          ).toBe('update');
        });

        it('offers to cut a release first as well', () => {
          expect(
            standing({ ...pinnedWithNewerRelease, hasUnreleasedChanges: true })
              .canReleaseAndUpdate,
          ).toBe(true);
        });
      });

      describe('and that release is the whole of the package', () => {
        it('offers nothing a release would add', () => {
          expect(
            standing({ ...pinnedWithNewerRelease, hasUnreleasedChanges: false })
              .canReleaseAndUpdate,
          ).toBe(false);
        });
      });

      it('compares releases by triple rather than by string', () => {
        expect(
          standing({ versionSpec: '0.9.0', latestReleaseVersion: '0.10.0' })
            .status,
        ).toBe('behind');
      });

      it('is not behind a release that only looks newer as a string', () => {
        expect(
          standing({
            versionSpec: '0.10.0',
            latestReleaseVersion: '0.9.0',
            hasUnreleasedChanges: false,
          }).status,
        ).toBe('up-to-date');
      });
    });

    describe('and it sits on the newest release there is', () => {
      const pinnedToNewest = {
        versionSpec: '0.1.0',
        latestReleaseVersion: '0.1.0',
      };

      describe('and the package has unreleased changes', () => {
        it('still reads as behind', () => {
          expect(
            standing({ ...pinnedToNewest, hasUnreleasedChanges: true }).status,
          ).toBe('behind');
        });

        it('asks for a release rather than a distribution', () => {
          expect(
            standing({ ...pinnedToNewest, hasUnreleasedChanges: true }).remedy,
          ).toBe('release');
        });

        it('offers that release', () => {
          expect(
            standing({ ...pinnedToNewest, hasUnreleasedChanges: true })
              .canReleaseAndUpdate,
          ).toBe(true);
        });
      });

      describe('and the package has not moved since', () => {
        it('reads as up to date', () => {
          expect(
            standing({ ...pinnedToNewest, hasUnreleasedChanges: false }).status,
          ).toBe('up-to-date');
        });

        it('offers nothing', () => {
          expect(
            standing({ ...pinnedToNewest, hasUnreleasedChanges: false }).remedy,
          ).toBe('none');
        });

        it('offers no release either', () => {
          expect(
            standing({ ...pinnedToNewest, hasUnreleasedChanges: false })
              .canReleaseAndUpdate,
          ).toBe(false);
        });
      });
    });

    describe('and components are late against the live package', () => {
      it('ignores them, because the pin is what put them there', () => {
        expect(
          standing({
            versionSpec: '0.1.0',
            latestReleaseVersion: '0.1.0',
            hasUnreleasedChanges: false,
            behindArtifactCount: 4,
          }).status,
        ).toBe('up-to-date');
      });
    });
  });

  describe('when the destination tracks the live package', () => {
    describe('and its last distribution is missing content', () => {
      it('reads as drifted rather than behind', () => {
        expect(standing({ behindArtifactCount: 1 }).status).toBe('drifted');
      });

      it('offers to distribute the live content', () => {
        expect(standing({ behindArtifactCount: 1 }).remedy).toBe('update');
      });
    });

    describe('and the package has unreleased changes', () => {
      it('offers no release, because a cut moves nothing there', () => {
        expect(
          standing({ behindArtifactCount: 1, hasUnreleasedChanges: true })
            .canReleaseAndUpdate,
        ).toBe(false);
      });
    });

    describe('and its last distribution carries everything', () => {
      it('reads as up to date even with a release pending', () => {
        expect(
          standing({ behindArtifactCount: 0, hasUnreleasedChanges: true })
            .status,
        ).toBe('up-to-date');
      });
    });
  });

  describe('when the distribution recorded no spec', () => {
    it('is measured against the live package', () => {
      expect(
        standing({ versionSpec: null, behindArtifactCount: 1 }).status,
      ).toBe('drifted');
    });
  });

  describe('when the spec is not a version at all', () => {
    it('falls back to the live package rather than inventing a pin', () => {
      expect(
        standing({ versionSpec: '^0.1.0', behindArtifactCount: 1 }).status,
      ).toBe('drifted');
    });
  });

  describe('when the package has never been released', () => {
    it('leaves a wildcard destination measured against the live package', () => {
      expect(
        standing({
          versionSpec: '*',
          latestReleaseVersion: null,
          behindArtifactCount: 0,
        }).status,
      ).toBe('up-to-date');
    });

    it('asks a pinned destination for a release it can move to', () => {
      expect(
        standing({
          versionSpec: '0.1.0',
          latestReleaseVersion: null,
          hasUnreleasedChanges: true,
        }).remedy,
      ).toBe('release');
    });
  });
});

describe('needsAttention', () => {
  it('is false for an up-to-date destination', () => {
    expect(
      needsAttention({
        status: 'up-to-date',
        remedy: 'none',
        canReleaseAndUpdate: false,
      }),
    ).toBe(false);
  });

  it('is true for a drifted one', () => {
    expect(
      needsAttention({
        status: 'drifted',
        remedy: 'update',
        canReleaseAndUpdate: false,
      }),
    ).toBe(true);
  });

  it('is true for one waiting on a release', () => {
    expect(
      needsAttention({
        status: 'behind',
        remedy: 'release',
        canReleaseAndUpdate: true,
      }),
    ).toBe(true);
  });
});
