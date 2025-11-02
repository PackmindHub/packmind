import { PMPage, PMText, PMVStack, PMBox } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { RotatingWord } from '../../src/shared/components/animation/RotatingWord';
import { PackagesList } from '../../src/domain/packages/components/PackagesList';

export default function OrgPackagesIndex() {
  const { organization } = useAuthContext();
  if (!organization) {
    return null;
  }

  const words = ['npm', 'maven', 'composer', 'gradle'] as const;

  return (
    <PMPage title="Packages" breadcrumbComponent={<AutobreadCrumb />}>
      <PMVStack align="stretch" gap={6}>
        <PMBox mb={4}>
          <PMVStack align="stretch" gap={1}>
            <PMText variant="body" whiteSpace="pre-line">
              <RotatingWord words={words} interval={2000} /> for AI agent
              engineering playbook.
              {'\n\n'}
              Packages are a set of standards, recipes and skills.
              {'\n\n'}
              Coming soon.
              {'\n\n'}
              Stay tuned ;-)
            </PMText>
          </PMVStack>
        </PMBox>
        <PackagesList />
      </PMVStack>
    </PMPage>
  );
}
