import { GitProviderId, GitRepo } from '@packmind/types';

export type OwnerReading = {
  owner: string;
  // The only provider whose repositories the reading names, null for any.
  providerId: GitProviderId | null;
};

/**
 * The first repository a reading of the owner finds, readings tried in order.
 */
export async function findByOwnerReadings(
  readings: ReadonlyArray<OwnerReading>,
  find: (owner: string) => Promise<GitRepo | null>,
): Promise<GitRepo | null> {
  for (const { owner, providerId } of readings) {
    const gitRepo = await find(owner);
    if (gitRepo && (providerId === null || gitRepo.providerId === providerId)) {
      return gitRepo;
    }
  }
  return null;
}
