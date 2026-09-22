/**
 * The parts of a package's version bar the e2e suite reads.
 *
 * Named rather than located by their neighbours: the suite used to reach the
 * version through `preceding-sibling` of the release action, so a bar that
 * dropped a sentence, or that drops the action entirely when there is nothing
 * to cut, took the version with it. It also meant the labels themselves were
 * the contract, and those are the first thing a redesign rewrites.
 */
export enum PackageVersionBarDataTestId {
  /** What the bar says is on screen: the ref control, or the sentence that replaces it. */
  Reading = 'PackageVersionBarDataTestId.Reading',
  /** One component of a release being read, with the version it was frozen at. */
  PinnedComponent = 'PackageVersionBarDataTestId.PinnedComponent',
}
