import { Palette } from "lucide-react";

export default function AppearancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="p-4 rounded-2xl bg-primary/10">
        <Palette size={40} className="text-primary" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-foreground mb-1">Appearance</h1>
        <p className="text-sm text-muted max-w-sm">
          This feature is coming soon. You&apos;ll be able to customize the look
          and feel of your workspace here.
        </p>
      </div>
    </div>
  );
}
