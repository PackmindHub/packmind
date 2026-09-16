import React from 'react';
import { PMPage, PMVStack } from '@packmind/ui';
import { UserProfileSection } from './UserProfileSection';
import { SpaceNavModeSection } from '../../organizations/components/SpaceNavModeSection';

export function ProfilePage() {
  return (
    <PMPage
      title="Profile"
      subtitle="Your details, and how Packmind looks for you."
    >
      <PMVStack align="stretch" gap={6}>
        <UserProfileSection />
        <SpaceNavModeSection />
      </PMVStack>
    </PMPage>
  );
}
