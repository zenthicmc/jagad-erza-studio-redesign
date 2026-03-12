"use client";

import SettingsPage from "@/components/features/settings/settings-page";
import SecurityTab from "@/components/features/settings/security-tab";

export default function Page() {
  return (
    <SettingsPage activeTab="security">
      <SecurityTab />
    </SettingsPage>
  );
}
