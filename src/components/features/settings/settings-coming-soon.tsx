"use client";

import React from "react";
import { Settings } from "lucide-react";

export default function SettingsComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Settings size={28} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Coming Soon
      </h3>
      <p className="text-sm text-muted max-w-xs">
        This feature is under development and will be available soon.
      </p>
    </div>
  );
}
