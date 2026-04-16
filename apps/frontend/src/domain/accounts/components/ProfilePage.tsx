import React from 'react';
import { PMPage } from '@packmind/ui';
import { UserProfileSection } from './UserProfileSection';

export function ProfilePage() {
  return (
    <PMPage
      title="Profile"
      subtitle="How you appear to your team across Packmind."
    >
      <UserProfileSection />
    </PMPage>
  );
}
