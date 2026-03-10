import { useEffect, useState } from 'react';
import {
  PMButton,
  PMButtonGroup,
  PMCheckbox,
  PMCloseButton,
  PMDialog,
  PMPortal,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  ArtefactType,
  ARTEFACT_TYPE_LABEL,
  RemoveArtefactDecision,
  StubPackage,
} from '../types';

interface RemoveFromPackagesModalProps {
  artefactType: ArtefactType;
  packages: StubPackage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (decision: RemoveArtefactDecision) => void;
}

export function RemoveFromPackagesModal({
  artefactType,
  packages,
  open,
  onOpenChange,
  onAccept,
}: RemoveFromPackagesModalProps) {
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (open) setSelectedPackageIds(new Set());
  }, [open]);

  const handleCheckedChange = (packageId: string, checked: boolean) => {
    setSelectedPackageIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(packageId);
      else next.delete(packageId);
      return next;
    });
  };

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      placement="center"
    >
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>
                Remove {ARTEFACT_TYPE_LABEL[artefactType].toLowerCase()}:
              </PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMVStack align="flex-start" gap={4}>
                <PMText fontWeight="semibold">
                  Select from which packages the{' '}
                  {ARTEFACT_TYPE_LABEL[artefactType].toLowerCase()} will be
                  removed:
                </PMText>
                <PMVStack align="flex-start" gap={2}>
                  {packages.map((pkg) => (
                    <PMCheckbox
                      key={pkg.id}
                      checked={selectedPackageIds.has(pkg.id)}
                      onChange={(e) =>
                        handleCheckedChange(
                          pkg.id,
                          (e.target as HTMLInputElement).checked,
                        )
                      }
                    >
                      {pkg.name}
                    </PMCheckbox>
                  ))}
                </PMVStack>
              </PMVStack>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMButtonGroup size="sm">
                <PMDialog.Trigger asChild>
                  <PMButton variant="outline" size="sm">
                    Cancel
                  </PMButton>
                </PMDialog.Trigger>
                <PMButton
                  size="sm"
                  colorPalette="blue"
                  disabled={selectedPackageIds.size === 0}
                  onClick={() =>
                    onAccept({
                      delete: false,
                      removeFromPackages: [...selectedPackageIds],
                    })
                  }
                >
                  Accept
                </PMButton>
              </PMButtonGroup>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
}
