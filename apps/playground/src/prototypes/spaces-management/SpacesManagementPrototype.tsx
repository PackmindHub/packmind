import { PMButton, PMIcon, PMPage } from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';
import { TableDrawerVariation } from './components/TableDrawerVariation';
import { Toolbar } from './components/shared/Toolbar';
import { TOTAL_SPACES_LABEL } from './data';

export default function SpacesManagementPrototype() {
  return (
    <PMPage
      title="Spaces"
      subtitle={`Manage every space in your organization \u00b7 ${TOTAL_SPACES_LABEL}`}
      isFullWidth
      actions={
        <Toolbar
          extraFilters={
            <>
              <PMButton variant="secondary" size="sm">
                Admin: any
                <PMIcon fontSize="xs">
                  <LuChevronDown />
                </PMIcon>
              </PMButton>
              <PMButton variant="secondary" size="sm">
                Member: any
                <PMIcon fontSize="xs">
                  <LuChevronDown />
                </PMIcon>
              </PMButton>
            </>
          }
        />
      }
    >
      <TableDrawerVariation
        density="comfortable"
        showBulk
        initialTab="general"
      />
    </PMPage>
  );
}
