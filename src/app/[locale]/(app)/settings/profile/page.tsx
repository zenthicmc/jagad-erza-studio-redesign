"use client";

import SettingsPage from "@/components/features/settings/settings-page";
import ProfileTab from "@/components/features/settings/profile-tab";

export default function Page() {
  return (
    <SettingsPage activeTab="profile">
      <ProfileTab />
    </SettingsPage>
  );
}
