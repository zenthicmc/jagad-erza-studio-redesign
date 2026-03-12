"use client";

import SettingsPage from "@/components/features/settings/settings-page";
import SettingsComingSoon from "@/components/features/settings/settings-coming-soon";

export default function Page() {
  return (
    <SettingsPage activeTab="creditBalance">
      <SettingsComingSoon />
    </SettingsPage>
  );
}
