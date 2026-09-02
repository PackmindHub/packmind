import { pmToaster } from '@packmind/ui';
import type { PackageId, Standard } from '@packmind/types';
import { useAttachToPackage } from '../../deployments/hooks/useCreateIntoPackage';

/**
 * What to do with the standards the samples modal has just created.
 *
 * Samples are the one creation path that finishes inside the app and knows the
 * ids at the end, so what it makes can join a package in the same gesture. The
 * agent paths cannot: nothing exists yet when their dialog closes.
 *
 * Its own hook because two surfaces offer samples, the standards page and the
 * Context menu, and only the second passes a package. The failure copy is the
 * part worth sharing: a reader who sees "created, but not added" needs to be
 * told where the standards actually are, and that sentence should not exist in
 * two versions.
 */
export function useSamplesIntoPackage(packageId?: PackageId) {
  const attachToPackage = useAttachToPackage(packageId ?? null);

  return (created: Standard[]) => {
    void attachToPackage({
      standardIds: created.map((standard) => standard.id),
    }).then((outcome) => {
      if (outcome === 'failed') {
        pmToaster.error({
          title: 'Standards created, but not added to the package',
          description:
            'They are in the space. Add them to a package to distribute them.',
        });
      }
    });
  };
}
