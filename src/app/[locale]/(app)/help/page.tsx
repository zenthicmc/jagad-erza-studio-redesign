import { HelpCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="p-4 rounded-2xl bg-primary/10">
        <HelpCircle size={40} className="text-primary" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-foreground mb-1">Help Center</h1>
        <p className="text-sm text-muted max-w-sm">
          This feature is coming soon. You&apos;ll be able to find answers and
          contact support here.
        </p>
      </div>
    </div>
  );
}
