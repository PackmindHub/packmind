/**
 * The parts of the distribution log the e2e suite reads.
 *
 * Named rather than counted: index-based lookups silently broke when the
 * table's columns were reshuffled. A name survives a column moving, being
 * added, or going away.
 */
export enum DeploymentsHistoryDataTestId {
  /** The repository a distribution landed in, first line of the destination. */
  DestinationRepository = 'DeploymentsHistoryDataTestId.DestinationRepository',
  /** Its branch, and the path when the target is not the repository root. */
  DestinationDetail = 'DeploymentsHistoryDataTestId.DestinationDetail',
  /** The badge saying how the distribution ended. */
  Status = 'DeploymentsHistoryDataTestId.Status',
}
