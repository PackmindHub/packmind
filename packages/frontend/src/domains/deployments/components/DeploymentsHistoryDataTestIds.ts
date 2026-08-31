/**
 * The parts of the distribution log the e2e suite reads.
 *
 * Named rather than counted. The suite used to find these by cell index, which
 * held until two columns it knew nothing about were dropped from the table: the
 * destination then read as a repository glued to its branch, and the author
 * column it was pointing at had become the status. A name survives a column
 * moving, being added, or going away.
 */
export enum DeploymentsHistoryDataTestId {
  /** The repository a distribution landed in, first line of the destination. */
  DestinationRepository = 'DeploymentsHistoryDataTestId.DestinationRepository',
  /** Its branch, and the path when the target is not the repository root. */
  DestinationDetail = 'DeploymentsHistoryDataTestId.DestinationDetail',
  /** The badge saying how the distribution ended. */
  Status = 'DeploymentsHistoryDataTestId.Status',
}
