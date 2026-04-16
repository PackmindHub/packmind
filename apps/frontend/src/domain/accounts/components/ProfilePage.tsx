import React from 'react';
import { PMPage } from '@packmind/ui';
import { UserProfileSection } from './UserProfileSection';

export function ProfilePage() {
  return (
    <PMPage title="Profile" subtitle="Manage your personal information.">
      <UserProfileSection />
    </PMPage>
  );
}
