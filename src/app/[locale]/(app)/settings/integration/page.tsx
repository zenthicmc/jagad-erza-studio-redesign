"use client";

import SettingsPage from "@/components/features/settings/settings-page";
import IntegrationTab from "@/components/features/settings/integration-tab";

export default function Page() {
  return (
    <SettingsPage activeTab="integration">
      <IntegrationTab />
    </SettingsPage>
  );
}
